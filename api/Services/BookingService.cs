using System.Globalization;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IBookingService
{
    Task<IReadOnlyList<BookingDto>> GetBookingsAsync(
        string? status = null,
        Guid? questId = null,
        string? aggregator = null,
        string? promoCode = null,
        DateOnly? dateFrom = null,
        DateOnly? dateTo = null,
        string? sort = null);
    Task<BookingDto> CreateBookingAsync(BookingCreateDto dto, bool isAdminRequest = false);
    Task<bool> UpdateBookingAsync(Guid id, BookingUpdateDto dto);
    Task<bool> DeleteBookingAsync(Guid id);
    Task<BookingImportResultDto> ImportBookingsAsync(string content);
}

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    private readonly IEmailNotificationService _emailNotificationService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IBlacklistService _blacklistService;
    private static readonly CultureInfo ImportCulture = new("ru-RU");

    public BookingService(
        AppDbContext context,
        IEmailNotificationService emailNotificationService,
        IServiceScopeFactory scopeFactory,
        IBlacklistService blacklistService)
    {
        _context = context;
        _emailNotificationService = emailNotificationService;
        _scopeFactory = scopeFactory;
        _blacklistService = blacklistService;
    }

    public async Task<IReadOnlyList<BookingDto>> GetBookingsAsync(
        string? status = null,
        Guid? questId = null,
        string? aggregator = null,
        string? promoCode = null,
        DateOnly? dateFrom = null,
        DateOnly? dateTo = null,
        string? sort = null)
    {
        var query = _context.Bookings
            .Include(b => b.ExtraServices)
            .Include(b => b.QuestSchedule)
            .Include(b => b.Quest)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(b => b.Status == status);
        }

        if (questId.HasValue)
        {
            query = query.Where(b => b.QuestId == questId.Value);
        }

        if (!string.IsNullOrWhiteSpace(aggregator))
        {
            if (aggregator == "site")
            {
                query = query.Where(b => b.Aggregator == null || b.Aggregator == string.Empty);
            }
            else
            {
                query = query.Where(b => b.Aggregator == aggregator);
            }
        }

        if (!string.IsNullOrWhiteSpace(promoCode))
        {
            if (promoCode == "none")
            {
                query = query.Where(b => b.PromoCode == null || b.PromoCode == string.Empty);
            }
            else
            {
                query = query.Where(b => b.PromoCode == promoCode);
            }
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(b => b.BookingDate >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(b => b.BookingDate <= dateTo.Value);
        }

        var orderedQuery = ApplySorting(query, sort);

        var items = await orderedQuery.ToListAsync();
        var dtos = items.Select(ToDto).ToList();
        await EnrichWithBlacklistAsync(dtos);
        return dtos;
    }

    public async Task<BookingDto> CreateBookingAsync(BookingCreateDto dto, bool isAdminRequest = false)
    {
        var isApiBooking = !string.IsNullOrWhiteSpace(dto.Aggregator) || !string.IsNullOrWhiteSpace(dto.AggregatorUniqueId);
        if (!isAdminRequest && await _blacklistService.IsBookingBlockedAsync(dto.CustomerPhone, dto.CustomerEmail, isApiBooking))
        {
            throw new InvalidOperationException("Бронирование запрещено для этого контакта.");
        }

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
                    .Include(q => q.ParentQuest)
                    .FirstOrDefaultAsync(q => q.Id == questId.Value);
            }

            if (quest == null)
            {
                throw new InvalidOperationException("Квест не найден.");
            }

            var pricingQuest = quest.ParentQuest ?? quest;
            var standardPriceParticipantsMax = quest.StandardPriceParticipantsMax > 0
                ? quest.StandardPriceParticipantsMax
                : 4;
            var maxParticipants = ResolveParticipantsMax(quest, standardPriceParticipantsMax);
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
            var extraParticipantsCount = Math.Max(0, dto.ParticipantsCount - standardPriceParticipantsMax);
            var extraParticipantsTotal = extraParticipantsCount * Math.Max(0, pricingQuest.ExtraParticipantPrice);
            var extrasTotal = selectedExtras.Sum(service => service.Price)
                + customExtras.Sum(service => service.Price);
            var paymentType = string.IsNullOrWhiteSpace(dto.PaymentType)
                ? "cash"
                : dto.PaymentType!.ToLowerInvariant();
            var basePrice = schedule?.Price ?? pricingQuest.Price;
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
                LegacyId = await GetNextLegacyIdAsync(),
                Notes = dto.Notes,
                Aggregator = string.IsNullOrWhiteSpace(dto.Aggregator) ? null : dto.Aggregator,
                AggregatorUniqueId = string.IsNullOrWhiteSpace(dto.AggregatorUniqueId)
                    ? null
                    : dto.AggregatorUniqueId,
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
            await EnrichWithBlacklistAsync(new List<BookingDto> { result });
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
        if (dto.AggregatorUniqueId != null)
        {
            booking.AggregatorUniqueId = string.IsNullOrWhiteSpace(dto.AggregatorUniqueId)
                ? null
                : dto.AggregatorUniqueId;
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
            var normalizedServices = dto.ExtraServices
                .Select(service => new
                {
                    Id = service.Id != Guid.Empty ? service.Id : (Guid?)null,
                    Title = service.Title?.Trim() ?? string.Empty,
                    service.Price
                })
                .Where(service => !string.IsNullOrWhiteSpace(service.Title))
                .ToList();

            var existingServices = await _context.BookingExtraServices
                .Where(service => service.BookingId == booking.Id)
                .ToListAsync();

            var incomingIds = normalizedServices
                .Where(service => service.Id.HasValue)
                .Select(service => service.Id!.Value)
                .ToHashSet();

            foreach (var service in existingServices.Where(service => !incomingIds.Contains(service.Id)))
            {
                _context.BookingExtraServices.Remove(service);
            }

            foreach (var serviceDto in normalizedServices)
            {
                if (serviceDto.Id.HasValue)
                {
                    var existing = existingServices.FirstOrDefault(service => service.Id == serviceDto.Id.Value);
                    if (existing != null)
                    {
                        existing.Title = serviceDto.Title;
                        existing.Price = serviceDto.Price;
                        continue;
                    }
                }

                _context.BookingExtraServices.Add(new BookingExtraService
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    Title = serviceDto.Title,
                    Price = serviceDto.Price,
                    CreatedAt = DateTime.UtcNow
                });
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
            LegacyId = booking.LegacyId,
            Notes = booking.Notes,
            Aggregator = booking.Aggregator,
            AggregatorUniqueId = booking.AggregatorUniqueId,
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


    private async Task EnrichWithBlacklistAsync(List<BookingDto> bookings)
    {
        foreach (var booking in bookings)
        {
            var matches = await _blacklistService.FindMatchesAsync(booking.CustomerPhone, booking.CustomerEmail);
            booking.BlacklistMatches = matches.ToList();
            booking.IsBlacklisted = booking.BlacklistMatches.Count > 0;
        }
    }
    public async Task<BookingImportResultDto> ImportBookingsAsync(string content)
    {
        var result = new BookingImportResultDto();
        var normalized = NormalizeImportContent(content);
        using var reader = new StringReader(normalized);

        var headerLine = ReadNextNonEmptyLine(reader);
        if (headerLine == null)
        {
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = 0,
                Reason = "Импортируемый файл пустой."
            });
            return result;
        }

        var delimiter = DetectDelimiter(headerLine);
        var headers = ParseDelimitedLine(headerLine, delimiter);
        var headerLookup = headers
            .Select((header, index) => new { header = header.Trim().ToLowerInvariant(), index })
            .Where(entry => !string.IsNullOrWhiteSpace(entry.header))
            .ToDictionary(entry => entry.header, entry => entry.index);

        var existingLegacyIds = await _context.Bookings
            .Where(b => b.LegacyId.HasValue)
            .Select(b => b.LegacyId!.Value)
            .ToListAsync();
        var legacyIdSet = new HashSet<int>(existingLegacyIds);
        var importedLegacyIds = new HashSet<int>();

        var questLookup = await _context.Quests
            .Include(q => q.ParentQuest)
            .AsNoTracking()
            .ToDictionaryAsync(q => q.Slug.ToLowerInvariant(), q => q);

        var scheduleCache = new Dictionary<(Guid questId, DateOnly date, TimeOnly time), QuestSchedule>();

        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var fields = ParseDelimitedLine(line, delimiter);
            if (fields.Count == 0)
            {
                continue;
            }

            result.TotalRows++;

            var record = new ImportRecord(headerLookup, fields);
            if (record.IsEmpty)
            {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                Reason = "Пустая строка."
            });
            continue;
        }

        if (string.IsNullOrWhiteSpace(record.Email) && string.IsNullOrWhiteSpace(record.Phone))
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                Reason = "Не указан телефон и e-mail."
            });
            continue;
        }

        if (!int.TryParse(record.LegacyId, NumberStyles.Integer, CultureInfo.InvariantCulture, out var legacyId))
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                Reason = $"Некорректный Id '{record.LegacyId}'."
            });
            continue;
        }

        if (!importedLegacyIds.Add(legacyId))
        {
            result.Duplicates++;
            result.DuplicateRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = "Дубликат Id внутри импортируемого файла."
            });
            continue;
        }

        if (legacyIdSet.Contains(legacyId))
        {
            result.Duplicates++;
            result.DuplicateRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = "Бронь с таким Id уже существует в базе."
            });
            continue;
        }

        if (string.IsNullOrWhiteSpace(record.QuestSlug))
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = "Не указан slug квеста."
            });
            continue;
        }

        if (!questLookup.TryGetValue(record.QuestSlug.ToLowerInvariant(), out var quest))
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = $"Квест со slug '{record.QuestSlug}' не найден."
            });
            continue;
        }

        if (!TryParseCreatedAt(record.CreatedAt, out var createdAt))
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = $"Не удалось разобрать дату создания '{record.CreatedAt}'."
            });
            continue;
        }

        if (!TryParseBookingDateTime(record.BookingDateTime, out var bookingDateTime))
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = $"Не удалось разобрать дату квеста '{record.BookingDateTime}'."
            });
            continue;
        }

            var pricingQuest = quest.ParentQuest ?? quest;
            var bookingDate = DateOnly.FromDateTime(bookingDateTime);
            var bookingTime = TimeOnly.FromDateTime(bookingDateTime);
            var scheduleQuestId = pricingQuest.Id;
            var scheduleKey = (scheduleQuestId, bookingDate, bookingTime);
        QuestSchedule? schedule = null;
        if (!scheduleCache.TryGetValue(scheduleKey, out schedule))
        {
            var scheduleFromDb = await _context.QuestSchedules
                .FirstOrDefaultAsync(s =>
                    s.QuestId == scheduleQuestId
                    && s.Date == bookingDate
                    && s.TimeSlot == bookingTime);

            if (scheduleFromDb == null)
            {
                schedule = new QuestSchedule
                    {
                        Id = Guid.NewGuid(),
                        QuestId = scheduleQuestId,
                        Date = bookingDate,
                        TimeSlot = bookingTime,
                        Price = record.Price > 0 ? record.Price : pricingQuest.Price,
                        IsBooked = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                _context.QuestSchedules.Add(schedule);
            }
            else
            {
                schedule = scheduleFromDb;
            }

            scheduleCache[scheduleKey] = schedule;
        }

        var scheduleAlreadyBooked = schedule != null
            && await _context.Bookings.AnyAsync(b => b.QuestScheduleId == schedule.Id);
        if (scheduleAlreadyBooked)
        {
            result.Skipped++;
            result.SkippedRows.Add(new BookingImportIssueDto
            {
                RowNumber = result.TotalRows,
                LegacyId = legacyId,
                Reason = "Слот расписания уже занят."
            });
            continue;
        }

        schedule.IsBooked = true;
        schedule.UpdatedAt = DateTime.UtcNow;

            var status = MapLegacyStatus(record.Status);
            var paymentType = MapPaymentType(record.PaymentTypeCode, out var aggregator);
            var participantsCount = Math.Max(1, quest.ParticipantsMin);
            var customerName = string.IsNullOrWhiteSpace(record.Name) ? "Не указано" : record.Name;

            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                QuestId = quest.Id,
                QuestScheduleId = schedule.Id,
                CustomerName = customerName.Trim(),
                CustomerPhone = string.IsNullOrWhiteSpace(record.Phone) ? "не указан" : record.Phone,
                CustomerEmail = record.Email,
                BookingDate = bookingDate,
                ParticipantsCount = participantsCount,
                ExtraParticipantsCount = 0,
                TotalPrice = record.Price,
                PaymentType = paymentType,
                Status = status,
                LegacyId = legacyId,
                Notes = record.Comment,
                Aggregator = aggregator,
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            };

        _context.Bookings.Add(booking);
        legacyIdSet.Add(legacyId);
        result.Imported++;
    }

    await _context.SaveChangesAsync();
    result.Processed = result.Imported + result.Skipped + result.Duplicates;
    return result;
}

    private static IOrderedQueryable<Booking> ApplySorting(IQueryable<Booking> query, string? sort)
    {
        var sortParts = ParseSortParts(sort);
        if (!sortParts.Any())
        {
            return query.OrderByDescending(b => b.CreatedAt)
                .ThenBy(b => b.BookingDate)
                .ThenBy(b => b.QuestSchedule != null ? b.QuestSchedule.TimeSlot : (TimeOnly?)null);
        }

        IOrderedQueryable<Booking>? ordered = null;
        foreach (var part in sortParts)
        {
            ordered = ApplySortPart(ordered ?? query, part.Key, part.Descending, ordered != null);
        }

        return ordered ?? query.OrderByDescending(b => b.CreatedAt).ThenBy(b => b.BookingDate);
    }

    private static IReadOnlyList<(string Key, bool Descending)> ParseSortParts(string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort))
        {
            return Array.Empty<(string, bool)>();
        }

        var parts = sort.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var result = new List<(string, bool)>();
        foreach (var part in parts)
        {
            var tokens = part.Split(':', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (tokens.Length == 0)
            {
                continue;
            }
            var key = tokens[0].ToLowerInvariant();
            var direction = tokens.Length > 1 ? tokens[1].ToLowerInvariant() : "asc";
            var descending = direction is "desc" or "descending";
            result.Add((key, descending));
        }
        return result;
    }

    private static IOrderedQueryable<Booking> ApplySortPart(
        IQueryable<Booking> query,
        string key,
        bool descending,
        bool isThenBy)
    {
        return key switch
        {
            "status" => ApplyOrder(query, b => b.Status, descending, isThenBy),
            "bookingdate" => ApplyDateSort(query, descending, isThenBy),
            "createdat" => ApplyOrder(query, b => b.CreatedAt, descending, isThenBy),
            "quest" => ApplyOrder(query, b => b.Quest != null ? b.Quest.Title : string.Empty, descending, isThenBy),
            "questprice" => ApplyOrder(query, b => b.Quest != null ? b.Quest.Price : 0, descending, isThenBy),
            "participants" => ApplyOrder(query, b => b.ParticipantsCount, descending, isThenBy),
            "extraparticipants" => ApplyOrder(query, b => b.ExtraParticipantsCount, descending, isThenBy),
            "extraparticipantprice" => ApplyOrder(query, b => b.Quest != null ? b.Quest.ExtraParticipantPrice : 0, descending, isThenBy),
            "extraservicesprice" => ApplyOrder(query, b => b.ExtraServices.Sum(service => (int?)service.Price) ?? 0, descending, isThenBy),
            "aggregator" => ApplyOrder(query, b => b.Aggregator ?? string.Empty, descending, isThenBy),
            "promocode" => ApplyOrder(query, b => b.PromoCode ?? string.Empty, descending, isThenBy),
            "totalprice" => ApplyOrder(query, b => b.TotalPrice, descending, isThenBy),
            "customer" => ApplyOrder(query, b => b.CustomerName, descending, isThenBy),
            "notes" => ApplyOrder(query, b => b.Notes ?? string.Empty, descending, isThenBy),
            _ => ApplyOrder(query, b => b.CreatedAt, descending, isThenBy),
        };
    }

    private static IOrderedQueryable<Booking> ApplyDateSort(IQueryable<Booking> query, bool descending, bool isThenBy)
    {
        var ordered = ApplyOrder(query, b => b.BookingDate, descending, isThenBy);
        return ApplyOrder(ordered, b => b.QuestSchedule != null ? b.QuestSchedule.TimeSlot : (TimeOnly?)null, descending, true);
    }

    private static IOrderedQueryable<Booking> ApplyOrder<TKey>(
        IQueryable<Booking> query,
        Expression<Func<Booking, TKey>> selector,
        bool descending,
        bool isThenBy)
    {
        if (isThenBy)
        {
            var ordered = (IOrderedQueryable<Booking>)query;
            return descending ? ordered.ThenByDescending(selector) : ordered.ThenBy(selector);
        }
        return descending ? query.OrderByDescending(selector) : query.OrderBy(selector);
    }

    private async Task<int> GetNextLegacyIdAsync()
    {
        var maxLegacyId = await _context.Bookings.MaxAsync(b => (int?)b.LegacyId) ?? 0;
        return maxLegacyId + 1;
    }

    private static string NormalizeImportContent(string content)
    {
        var normalized = content ?? string.Empty;
        if (!normalized.Contains('\n') && normalized.Contains("\\n", StringComparison.Ordinal))
        {
            normalized = normalized.Replace("\\n", "\n");
        }

        return normalized.Replace("\r\n", "\n");
    }

    private static string? ReadNextNonEmptyLine(StringReader reader)
    {
        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (!string.IsNullOrWhiteSpace(line))
            {
                return line;
            }
        }

        return null;
    }

    private static char DetectDelimiter(string headerLine)
    {
        if (headerLine.Contains(';'))
        {
            return ';';
        }

        if (headerLine.Contains('\t'))
        {
            return '\t';
        }

        return ',';
    }

    private static List<string> ParseDelimitedLine(string line, char delimiter)
    {
        var fields = new List<string>();
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
                fields.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(ch);
        }

        fields.Add(current.ToString());
        return fields;
    }

    private static bool TryParseCreatedAt(string? value, out DateTime createdAt)
    {
        createdAt = DateTime.UtcNow;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (DateTime.TryParseExact(
                value.Trim(),
                new[] { "dd.MM.yyyy HH:mm", "dd.MM.yyyy H:mm", "dd.MM.yyyy HH:mm:ss" },
                ImportCulture,
                DateTimeStyles.None,
                out var parsed))
        {
            createdAt = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
            return true;
        }

        return DateTime.TryParse(value.Trim(), ImportCulture, DateTimeStyles.None, out createdAt);
    }

    private static bool TryParseBookingDateTime(string? value, out DateTime bookingDateTime)
    {
        bookingDateTime = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return DateTime.TryParseExact(
                value.Trim(),
                new[] { "yyyy-MM-dd HH:mm:ss.fff", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm" },
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out bookingDateTime)
            || DateTime.TryParse(value.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out bookingDateTime);
    }

    private static string MapLegacyStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "confirmed";
        }

        var normalized = status.Trim().ToLowerInvariant();
        if (normalized.Contains("отмен"))
        {
            return "cancelled";
        }

        if (normalized.Contains("исполн"))
        {
            return "completed";
        }

        return "confirmed";
    }

    private static string MapPaymentType(string? code, out string? aggregator)
    {
        aggregator = null;
        if (string.IsNullOrWhiteSpace(code))
        {
            return "cash";
        }

        if (!int.TryParse(code.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value))
        {
            return "cash";
        }

        return value switch
        {
            2 => "certificate",
            3 => SetAggregator(out aggregator),
            _ => "cash"
        };
    }

    private static string SetAggregator(out string aggregator)
    {
        aggregator = "mir-kvestov";
        return "aggregator";
    }

    private sealed record ImportRecord(
        IReadOnlyDictionary<string, int> HeaderLookup,
        IReadOnlyList<string> Fields)
    {
        public string? LegacyId => Get("id");
        public string? CreatedAt => Get("time_create");
        public string? Status => Get("status");
        public string? QuestSlug => Get("eve");
        public string? BookingDateTime => Get("time");
        public string? Email => NullIfEmpty(Get("email"));
        public string? Name => NullIfEmpty(Get("name"));
        public string Phone => NullIfEmpty(Get("phone")) ?? string.Empty;
        public string? Comment => NullIfEmpty(Get("coment"));
        public string? PaymentTypeCode => NullIfEmpty(Get("oplata"));

        public int Price
        {
            get
            {
                var raw = Get("price");
                return int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
                    ? value
                    : 0;
            }
        }

        public bool IsEmpty => Fields.All(field => string.IsNullOrWhiteSpace(field));

        private string? Get(string key)
        {
            if (!HeaderLookup.TryGetValue(key, out var index))
            {
                return null;
            }

            if (index < 0 || index >= Fields.Count)
            {
                return null;
            }

            return Fields[index]?.Trim();
        }

        private static string? NullIfEmpty(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }

    private async Task RecalculateTotalsAsync(Booking booking)
    {
        var quest = booking.QuestId.HasValue
            ? await _context.Quests
                .Include(q => q.ParentQuest)
                .FirstOrDefaultAsync(q => q.Id == booking.QuestId.Value)
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

        var standardPriceParticipantsMax = quest.StandardPriceParticipantsMax > 0
            ? quest.StandardPriceParticipantsMax
            : 4;
        var maxParticipants = ResolveParticipantsMax(quest, standardPriceParticipantsMax);
        if (booking.ParticipantsCount < quest.ParticipantsMin || booking.ParticipantsCount > maxParticipants)
        {
            throw new InvalidOperationException("Количество участников выходит за допустимый диапазон.");
        }

        var extraParticipantsCount = Math.Max(0, booking.ParticipantsCount - standardPriceParticipantsMax);
        var pricingQuest = quest.ParentQuest ?? quest;
        var extraParticipantsTotal = extraParticipantsCount * Math.Max(0, pricingQuest.ExtraParticipantPrice);
        var extrasTotal = extraServices.Sum(service => service.Price);
        var basePrice = schedule?.Price ?? pricingQuest.Price;

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

    private static int ResolveParticipantsMax(Quest quest, int standardPriceParticipantsMax)
    {
        var maxParticipants = quest.ParticipantsMax > 0
            ? quest.ParticipantsMax
            : standardPriceParticipantsMax;
        if (quest.ExtraParticipantsMax > 0)
        {
            var extraParticipantsTotal = standardPriceParticipantsMax + quest.ExtraParticipantsMax;
            if (extraParticipantsTotal > maxParticipants)
            {
                maxParticipants = extraParticipantsTotal;
            }
        }

        return maxParticipants;
    }
}
