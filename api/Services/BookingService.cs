using System.Globalization;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IBookingService
{
    Task<IReadOnlyList<BookingDto>> GetBookingsAsync();
    Task<BookingDto> CreateBookingAsync(BookingCreateDto dto);
    Task<bool> UpdateBookingAsync(Guid id, BookingUpdateDto dto);
    Task<bool> DeleteBookingAsync(Guid id);
    Task<BookingImportResultDto> ImportLegacyBookingsAsync(string content);
}

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    private readonly IEmailNotificationService _emailNotificationService;
    private readonly IServiceScopeFactory _scopeFactory;

    public BookingService(
        AppDbContext context,
        IEmailNotificationService emailNotificationService,
        IServiceScopeFactory scopeFactory)
    {
        _context = context;
        _emailNotificationService = emailNotificationService;
        _scopeFactory = scopeFactory;
    }

    public async Task<IReadOnlyList<BookingDto>> GetBookingsAsync()
    {
        return await _context.Bookings
            .Include(b => b.ExtraServices)
            .Include(b => b.QuestSchedule)
            .OrderByDescending(b => b.CreatedAt)
            .ThenBy(b => b.BookingDate)
            .Select(b => ToDto(b))
            .ToListAsync();
    }

    public async Task<BookingDto> CreateBookingAsync(BookingCreateDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        Booking? booking = null;
        BookingDto result;

        try
        {
            Quest? quest = null;
            QuestSchedule? schedule = null;
            if (dto.QuestScheduleId.HasValue)
            {
                schedule = await _context.QuestSchedules.FindAsync(dto.QuestScheduleId.Value);
                if (schedule == null)
                {
                    throw new InvalidOperationException("Слот расписания не найден.");
                }

                if (schedule.IsBooked)
                {
                    throw new InvalidOperationException("Выбранное время уже забронировано.");
                }
            }

            if (!dto.QuestId.HasValue && schedule == null)
            {
                throw new InvalidOperationException("Не указан квест для бронирования.");
            }

            var questId = dto.QuestId ?? schedule?.QuestId;
            if (questId.HasValue)
            {
                quest = await _context.Quests
                    .Include(q => q.ExtraServices)
                    .FirstOrDefaultAsync(q => q.Id == questId.Value);
            }

            if (quest == null)
            {
                throw new InvalidOperationException("Квест не найден.");
            }

            var maxParticipants = quest.ParticipantsMax + Math.Max(0, quest.ExtraParticipantsMax);
            if (dto.ParticipantsCount < quest.ParticipantsMin || dto.ParticipantsCount > maxParticipants)
            {
                throw new InvalidOperationException("Количество участников выходит за допустимый диапазон.");
            }

            var selectedExtras = quest.ExtraServices
                .Where(service => dto.ExtraServiceIds.Contains(service.Id))
                .ToList();
            var customExtras = dto.ExtraServices?
                .Select(service => new BookingExtraServiceCreateDto
                {
                    Title = service.Title.Trim(),
                    Price = service.Price
                })
                .Where(service => !string.IsNullOrWhiteSpace(service.Title))
                .ToList() ?? new List<BookingExtraServiceCreateDto>();
            var extraParticipantsCount = Math.Max(0, dto.ParticipantsCount - quest.ParticipantsMax);
            var extraParticipantsTotal = extraParticipantsCount * Math.Max(0, quest.ExtraParticipantPrice);
            var extrasTotal = selectedExtras.Sum(service => service.Price)
                + customExtras.Sum(service => service.Price);
            var paymentType = string.IsNullOrWhiteSpace(dto.PaymentType)
                ? "cash"
                : dto.PaymentType!.ToLowerInvariant();
            var basePrice = schedule?.Price ?? quest.Price;
            var totalPrice = paymentType == "certificate"
                ? extrasTotal
                : basePrice + extraParticipantsTotal + extrasTotal;

            PromoCode? promoCode = null;
            int? promoDiscountAmount = null;
            if (!string.IsNullOrWhiteSpace(dto.PromoCode))
            {
                promoCode = await _context.PromoCodes
                    .FirstOrDefaultAsync(p =>
                        p.Code.ToLower() == dto.PromoCode!.ToLower()
                        && p.IsActive
                        && p.ValidFrom <= DateOnly.FromDateTime(DateTime.UtcNow)
                        && (p.ValidUntil == null || p.ValidUntil >= DateOnly.FromDateTime(DateTime.UtcNow)));
                if (promoCode != null)
                {
                    promoDiscountAmount = promoCode.DiscountType == "amount"
                        ? Math.Min(promoCode.DiscountValue, totalPrice)
                        : (int)Math.Round(totalPrice * (promoCode.DiscountValue / 100.0));
                    totalPrice = Math.Max(0, totalPrice - promoDiscountAmount.Value);
                }
            }

            booking = new Booking
            {
                Id = Guid.NewGuid(),
                QuestId = questId,
                QuestScheduleId = dto.QuestScheduleId,
                CustomerName = dto.CustomerName,
                CustomerPhone = dto.CustomerPhone,
                CustomerEmail = dto.CustomerEmail,
                BookingDate = schedule?.Date ?? dto.BookingDate,
                ParticipantsCount = dto.ParticipantsCount,
                ExtraParticipantsCount = extraParticipantsCount,
                TotalPrice = totalPrice,
                PaymentType = paymentType,
                PromoCodeId = promoCode?.Id,
                PromoCode = promoCode?.Code,
                PromoDiscountType = promoCode?.DiscountType,
                PromoDiscountValue = promoCode?.DiscountValue,
                PromoDiscountAmount = promoDiscountAmount,
                Status = "pending",
                Notes = dto.Notes,
                Aggregator = string.IsNullOrWhiteSpace(dto.Aggregator) ? null : dto.Aggregator,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            foreach (var service in selectedExtras)
            {
                booking.ExtraServices.Add(new BookingExtraService
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    QuestExtraServiceId = service.Id,
                    Title = service.Title,
                    Price = service.Price,
                    CreatedAt = DateTime.UtcNow
                });
            }

            foreach (var service in customExtras)
            {
                booking.ExtraServices.Add(new BookingExtraService
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    Title = service.Title,
                    Price = service.Price,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            if (schedule != null)
            {
                schedule.IsBooked = true;
                schedule.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            await transaction.CommitAsync();
            result = ToDto(booking);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        if (booking != null)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var scopedNotificationService = scope.ServiceProvider.GetRequiredService<IEmailNotificationService>();
                    await scopedNotificationService.SendBookingNotificationsAsync(booking);
                }
                catch
                {
                    // Ignore notification errors to avoid blocking booking creation.
                }
            });
        }

        return result;
    }

    public async Task<bool> UpdateBookingAsync(Guid id, BookingUpdateDto dto)
    {
        var booking = await _context.Bookings
            .Include(b => b.ExtraServices)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null)
        {
            return false;
        }

        var wasCancelled = booking.Status == "cancelled";
        var nextStatus = string.IsNullOrWhiteSpace(dto.Status) ? booking.Status : dto.Status;
        var shouldRecalculate = false;

        booking.Status = nextStatus;
        booking.Notes = dto.Notes;
        if (dto.QuestId.HasValue)
        {
            booking.QuestId = dto.QuestId.Value;
        }
        if (dto.QuestScheduleId.HasValue)
        {
            booking.QuestScheduleId = dto.QuestScheduleId.Value;
        }
        if (dto.CustomerName != null)
        {
            booking.CustomerName = dto.CustomerName;
        }
        if (dto.CustomerPhone != null)
        {
            booking.CustomerPhone = dto.CustomerPhone;
        }
        if (dto.CustomerEmail != null)
        {
            booking.CustomerEmail = string.IsNullOrWhiteSpace(dto.CustomerEmail)
                ? null
                : dto.CustomerEmail;
        }
        if (dto.Aggregator != null)
        {
            booking.Aggregator = string.IsNullOrWhiteSpace(dto.Aggregator)
                ? null
                : dto.Aggregator;
        }
        if (dto.BookingDate.HasValue)
        {
            booking.BookingDate = DateOnly.FromDateTime(dto.BookingDate.Value);
        }
        if (dto.ParticipantsCount.HasValue)
        {
            booking.ParticipantsCount = dto.ParticipantsCount.Value;
            shouldRecalculate = true;
        }
        if (dto.ExtraParticipantsCount.HasValue)
        {
            booking.ExtraParticipantsCount = dto.ExtraParticipantsCount.Value;
        }
        if (dto.PaymentType != null)
        {
            booking.PaymentType = string.IsNullOrWhiteSpace(dto.PaymentType)
                ? booking.PaymentType
                : dto.PaymentType.ToLowerInvariant();
            shouldRecalculate = true;
        }
        if (dto.PromoCode != null)
        {
            booking.PromoCode = string.IsNullOrWhiteSpace(dto.PromoCode) ? null : dto.PromoCode;
            shouldRecalculate = true;
        }
        if (dto.PromoDiscountType != null)
        {
            booking.PromoDiscountType = string.IsNullOrWhiteSpace(dto.PromoDiscountType)
                ? null
                : dto.PromoDiscountType;
            shouldRecalculate = true;
        }
        if (dto.PromoDiscountValue.HasValue)
        {
            booking.PromoDiscountValue = dto.PromoDiscountValue;
            shouldRecalculate = true;
        }
        if (dto.PromoDiscountAmount.HasValue)
        {
            booking.PromoDiscountAmount = dto.PromoDiscountAmount;
            shouldRecalculate = true;
        }
        if (dto.ExtraServices != null)
        {
            var updatedIds = dto.ExtraServices
                .Where(service => service.Id != Guid.Empty)
                .Select(service => service.Id)
                .ToHashSet();

            var toRemove = booking.ExtraServices
                .Where(service => !updatedIds.Contains(service.Id))
                .ToList();

            if (toRemove.Count > 0)
            {
                _context.BookingExtraServices.RemoveRange(toRemove);
            }

            foreach (var serviceDto in dto.ExtraServices)
            {
                var existing = booking.ExtraServices.FirstOrDefault(service => service.Id == serviceDto.Id);
                if (existing != null)
                {
                    existing.Title = serviceDto.Title;
                    existing.Price = serviceDto.Price;
                }
                else
                {
                    booking.ExtraServices.Add(new BookingExtraService
                    {
                        Id = serviceDto.Id == Guid.Empty ? Guid.NewGuid() : serviceDto.Id,
                        BookingId = booking.Id,
                        Title = serviceDto.Title,
                        Price = serviceDto.Price,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            shouldRecalculate = true;
        }

        booking.UpdatedAt = DateTime.UtcNow;

        if (shouldRecalculate)
        {
            await RecalculateTotalsAsync(booking);
        }

        if (dto.TotalPrice.HasValue)
        {
            booking.TotalPrice = dto.TotalPrice.Value;
        }

        if (nextStatus == "cancelled" && !wasCancelled && booking.QuestScheduleId.HasValue)
        {
            var schedule = await _context.QuestSchedules.FindAsync(booking.QuestScheduleId.Value);
            if (schedule != null)
            {
                schedule.IsBooked = false;
                schedule.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteBookingAsync(Guid id)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return false;
            }

            if (booking.QuestScheduleId.HasValue)
            {
                var schedule = await _context.QuestSchedules.FindAsync(booking.QuestScheduleId.Value);
                if (schedule != null)
                {
                    schedule.IsBooked = false;
                    schedule.UpdatedAt = DateTime.UtcNow;
                }
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<BookingImportResultDto> ImportLegacyBookingsAsync(string content)
    {
        var parsedRows = ParseLegacyRows(content);
        var result = new BookingImportResultDto
        {
            TotalRows = parsedRows.Count
        };

        if (parsedRows.Count == 0)
        {
            return result;
        }

        var existingLegacyIds = await _context.Bookings
            .Select(b => b.LegacyId)
            .ToListAsync();
        var knownLegacyIds = existingLegacyIds.ToHashSet();
        var bookedScheduleIds = await _context.Bookings
            .Where(b => b.QuestScheduleId.HasValue)
            .Select(b => b.QuestScheduleId!.Value)
            .ToHashSetAsync();

        var questsBySlug = await _context.Quests
            .AsNoTracking()
            .ToDictionaryAsync(q => q.Slug, StringComparer.OrdinalIgnoreCase);

        var scheduleCache = new Dictionary<(Guid QuestId, DateOnly Date, TimeOnly Time), QuestSchedule>();

        foreach (var row in parsedRows)
        {
            if (row.IsEmpty)
            {
                result.Skipped++;
                continue;
            }

            if (string.IsNullOrWhiteSpace(row.Phone) && string.IsNullOrWhiteSpace(row.Email))
            {
                result.Skipped++;
                continue;
            }

            if (!row.LegacyId.HasValue)
            {
                result.Errors++;
                continue;
            }

            if (!knownLegacyIds.Add(row.LegacyId.Value))
            {
                result.Duplicates++;
                continue;
            }

            var bookingDateTime = row.BookingDateTime;
            if (!bookingDateTime.HasValue)
            {
                result.Errors++;
                continue;
            }

            var quest = row.QuestSlug != null && questsBySlug.TryGetValue(row.QuestSlug, out var questValue)
                ? questValue
                : null;

            QuestSchedule? schedule = null;
            if (quest != null)
            {
                var date = DateOnly.FromDateTime(bookingDateTime.Value);
                var time = TimeOnly.FromDateTime(bookingDateTime.Value);
                var cacheKey = (quest.Id, date, time);

                if (!scheduleCache.TryGetValue(cacheKey, out schedule))
                {
                    schedule = await _context.QuestSchedules
                        .FirstOrDefaultAsync(s =>
                            s.QuestId == quest.Id && s.Date == date && s.TimeSlot == time);

                    if (schedule == null)
                    {
                        schedule = new QuestSchedule
                        {
                            Id = Guid.NewGuid(),
                            QuestId = quest.Id,
                            Date = date,
                            TimeSlot = time,
                            Price = row.Price ?? quest.Price,
                            IsBooked = row.Status != "cancelled",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.QuestSchedules.Add(schedule);
                    }
                    else
                    {
                        schedule.Price = schedule.Price == 0 ? row.Price ?? quest.Price : schedule.Price;
                        schedule.IsBooked = row.Status != "cancelled" || schedule.IsBooked;
                        schedule.UpdatedAt = DateTime.UtcNow;
                    }

                    scheduleCache[cacheKey] = schedule;
                }

                if (schedule != null && bookedScheduleIds.Contains(schedule.Id))
                {
                    schedule = null;
                }
            }

            var notes = row.Comment;
            if (schedule == null && bookingDateTime.HasValue)
            {
                notes = AppendTimeNote(notes, bookingDateTime.Value);
            }

            var createdAt = row.CreatedAt ?? bookingDateTime.Value;
            var createdAtUtc = DateTime.SpecifyKind(createdAt, DateTimeKind.Utc);
            var participantsCount = Math.Max(1, quest?.ParticipantsMin ?? 1);

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                LegacyId = row.LegacyId.Value,
                QuestId = quest?.Id,
                QuestScheduleId = schedule?.Id,
                CustomerName = row.CustomerName ?? string.Empty,
                CustomerPhone = row.Phone ?? string.Empty,
                CustomerEmail = string.IsNullOrWhiteSpace(row.Email) ? null : row.Email,
                BookingDate = DateOnly.FromDateTime(bookingDateTime.Value),
                ParticipantsCount = participantsCount,
                ExtraParticipantsCount = 0,
                TotalPrice = row.Price ?? 0,
                PaymentType = row.PaymentType,
                Status = row.Status,
                Notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
                Aggregator = row.Aggregator,
                CreatedAt = createdAtUtc,
                UpdatedAt = createdAtUtc
            };

            _context.Bookings.Add(booking);
            if (schedule != null)
            {
                bookedScheduleIds.Add(schedule.Id);
            }
            result.Imported++;
        }

        await _context.SaveChangesAsync();
        return result;
    }

    private static BookingDto ToDto(Booking booking)
    {
        var bookingTime = booking.QuestSchedule?.TimeSlot;
        DateTime? bookingDateTime = null;
        if (bookingTime.HasValue)
        {
            bookingDateTime = booking.BookingDate.ToDateTime(bookingTime.Value);
        }

        return new BookingDto
        {
            Id = booking.Id,
            LegacyId = booking.LegacyId,
            QuestId = booking.QuestId,
            QuestScheduleId = booking.QuestScheduleId,
            CustomerName = booking.CustomerName,
            CustomerPhone = booking.CustomerPhone,
            CustomerEmail = booking.CustomerEmail,
            BookingDate = booking.BookingDate,
            BookingTime = bookingTime?.ToString("HH:mm"),
            BookingDateTime = bookingDateTime,
            ParticipantsCount = booking.ParticipantsCount,
            ExtraParticipantsCount = booking.ExtraParticipantsCount,
            TotalPrice = booking.TotalPrice,
            PaymentType = booking.PaymentType,
            PromoCode = booking.PromoCode,
            PromoDiscountType = booking.PromoDiscountType,
            PromoDiscountValue = booking.PromoDiscountValue,
            PromoDiscountAmount = booking.PromoDiscountAmount,
            Status = booking.Status,
            Notes = booking.Notes,
            Aggregator = booking.Aggregator,
            ExtraServices = booking.ExtraServices
                .Select(service => new BookingExtraServiceDto
                {
                    Id = service.Id,
                    Title = service.Title,
                    Price = service.Price
                })
                .ToList(),
            CreatedAt = booking.CreatedAt,
            UpdatedAt = booking.UpdatedAt
        };
    }

    private async Task RecalculateTotalsAsync(Booking booking)
    {
        var quest = booking.QuestId.HasValue
            ? await _context.Quests.FindAsync(booking.QuestId.Value)
            : null;
        if (quest == null)
        {
            return;
        }

        var schedule = booking.QuestScheduleId.HasValue
            ? await _context.QuestSchedules.FindAsync(booking.QuestScheduleId.Value)
            : null;

        var extraServices = await _context.BookingExtraServices
            .Where(service => service.BookingId == booking.Id)
            .ToListAsync();

        var extraParticipantsCount = Math.Max(0, booking.ParticipantsCount - quest.ParticipantsMax);
        var extraParticipantsTotal = extraParticipantsCount * Math.Max(0, quest.ExtraParticipantPrice);
        var extrasTotal = extraServices.Sum(service => service.Price);
        var basePrice = schedule?.Price ?? quest.Price;

        booking.ExtraParticipantsCount = extraParticipantsCount;
        var totalPrice = booking.PaymentType == "certificate"
            ? extrasTotal
            : basePrice + extraParticipantsTotal + extrasTotal;
        if (!string.IsNullOrWhiteSpace(booking.PromoDiscountType) && booking.PromoDiscountValue.HasValue)
        {
            var discountAmount = booking.PromoDiscountType == "amount"
                ? Math.Min(booking.PromoDiscountValue.Value, totalPrice)
                : (int)Math.Round(totalPrice * (booking.PromoDiscountValue.Value / 100.0));
            booking.PromoDiscountAmount = discountAmount;
            totalPrice = Math.Max(0, totalPrice - discountAmount);
        }
        booking.TotalPrice = totalPrice;
    }

    private static List<LegacyBookingRow> ParseLegacyRows(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return new List<LegacyBookingRow>();
        }

        var reader = new StringReader(content);
        string? line;
        var rows = new List<LegacyBookingRow>();

        var headerLine = ReadNextNonEmptyLine(reader, out var delimiter);
        if (headerLine == null)
        {
            return rows;
        }

        var headers = SplitDelimitedLine(headerLine, delimiter);
        var columnMap = headers
            .Select((header, index) => new { Header = header.Trim().TrimStart('\uFEFF').ToLowerInvariant(), Index = index })
            .ToDictionary(item => item.Header, item => item.Index);

        while ((line = reader.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var values = SplitDelimitedLine(line, delimiter);
            var row = new LegacyBookingRow
            {
                LegacyId = TryGetInt(values, columnMap, "id"),
                CreatedAt = TryGetDateTime(values, columnMap, "time_create", "dd.MM.yyyy HH:mm"),
                Status = NormalizeStatus(TryGetString(values, columnMap, "status")),
                QuestSlug = NormalizeSlug(TryGetString(values, columnMap, "eve")),
                BookingDateTime = TryGetDateTime(values, columnMap, "time", "yyyy-MM-dd HH:mm:ss.fff", "yyyy-MM-dd HH:mm:ss"),
                Email = NormalizeText(TryGetString(values, columnMap, "email")),
                CustomerName = NormalizeText(TryGetString(values, columnMap, "name")),
                Phone = NormalizeText(TryGetString(values, columnMap, "phone")),
                Comment = NormalizeText(TryGetString(values, columnMap, "coment")),
                Price = TryGetInt(values, columnMap, "price"),
                PaymentType = NormalizePaymentType(TryGetString(values, columnMap, "oplata")),
                Aggregator = NormalizeAggregator(TryGetString(values, columnMap, "oplata"))
            };

            row.IsEmpty = values.All(string.IsNullOrWhiteSpace);
            rows.Add(row);
        }

        return rows;
    }

    private static string? ReadNextNonEmptyLine(StringReader reader, out char delimiter)
    {
        delimiter = ';';
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            delimiter = line.Contains(';', StringComparison.Ordinal) ? ';' : '\t';
            return line;
        }

        return null;
    }

    private static List<string> SplitDelimitedLine(string line, char delimiter)
    {
        var result = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (ch == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (ch == delimiter && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(ch);
        }

        result.Add(current.ToString());
        return result;
    }

    private static string? TryGetString(IReadOnlyList<string> values, Dictionary<string, int> map, string key)
    {
        if (!map.TryGetValue(key, out var index))
        {
            return null;
        }

        if (index < 0 || index >= values.Count)
        {
            return null;
        }

        return values[index];
    }

    private static int? TryGetInt(IReadOnlyList<string> values, Dictionary<string, int> map, string key)
    {
        var raw = TryGetString(values, map, key);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return int.TryParse(raw.Trim(), out var parsed) ? parsed : null;
    }

    private static DateTime? TryGetDateTime(IReadOnlyList<string> values, Dictionary<string, int> map, string key, params string[] formats)
    {
        var raw = TryGetString(values, map, key);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        raw = raw.Trim();
        foreach (var format in formats)
        {
            if (DateTime.TryParseExact(raw, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                return parsed;
            }
        }

        return DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var fallback)
            ? fallback
            : null;
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "pending";
        }

        var normalized = status.Trim().ToLowerInvariant();
        if (normalized.Contains("исполн"))
        {
            return "completed";
        }

        if (normalized.Contains("отмен"))
        {
            return "cancelled";
        }

        return "pending";
    }

    private static string NormalizePaymentType(string? paymentRaw)
    {
        if (string.IsNullOrWhiteSpace(paymentRaw))
        {
            return "cash";
        }

        return paymentRaw.Trim() switch
        {
            "2" => "certificate",
            _ => "cash"
        };
    }

    private static string? NormalizeAggregator(string? paymentRaw)
    {
        if (string.IsNullOrWhiteSpace(paymentRaw))
        {
            return null;
        }

        return paymentRaw.Trim() == "3" ? "МИР КВЕСТОВ" : null;
    }

    private static string? NormalizeSlug(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return raw.Trim();
    }

    private static string? NormalizeText(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return raw.Trim().Trim('"');
    }

    private static string? AppendTimeNote(string? notes, DateTime dateTime)
    {
        var timeNote = $"Время: {dateTime:HH:mm}";
        if (string.IsNullOrWhiteSpace(notes))
        {
            return timeNote;
        }

        return $"{notes}\n{timeNote}";
    }

    private sealed class LegacyBookingRow
    {
        public int? LegacyId { get; set; }
        public DateTime? CreatedAt { get; set; }
        public string Status { get; set; } = "pending";
        public string? QuestSlug { get; set; }
        public DateTime? BookingDateTime { get; set; }
        public string? Email { get; set; }
        public string? CustomerName { get; set; }
        public string? Phone { get; set; }
        public string? Comment { get; set; }
        public int? Price { get; set; }
        public string PaymentType { get; set; } = "cash";
        public string? Aggregator { get; set; }
        public bool IsEmpty { get; set; }
    }
}
