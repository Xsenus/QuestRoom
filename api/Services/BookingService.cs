using Microsoft.EntityFrameworkCore;
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
}

public class BookingService : IBookingService
{
    private readonly AppDbContext _context;
    private readonly IEmailNotificationService _emailNotificationService;

    public BookingService(AppDbContext context, IEmailNotificationService emailNotificationService)
    {
        _context = context;
        _emailNotificationService = emailNotificationService;
    }

    public async Task<IReadOnlyList<BookingDto>> GetBookingsAsync()
    {
        return await _context.Bookings
            .Include(b => b.ExtraServices)
            .OrderBy(b => b.BookingDate)
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
            var extraParticipantsCount = Math.Max(0, dto.ParticipantsCount - quest.ParticipantsMax);
            var extraParticipantsTotal = extraParticipantsCount * Math.Max(0, quest.ExtraParticipantPrice);
            var extrasTotal = selectedExtras.Sum(service => service.Price);
            var paymentType = string.IsNullOrWhiteSpace(dto.PaymentType)
                ? "card"
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
            await _emailNotificationService.SendBookingNotificationsAsync(booking);
        }

        return result;
    }

    public async Task<bool> UpdateBookingAsync(Guid id, BookingUpdateDto dto)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return false;
        }

        var wasCancelled = booking.Status == "cancelled";
        var nextStatus = string.IsNullOrWhiteSpace(dto.Status) ? booking.Status : dto.Status;

        booking.Status = nextStatus;
        booking.Notes = dto.Notes;
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
        if (dto.ParticipantsCount.HasValue)
        {
            booking.ParticipantsCount = dto.ParticipantsCount.Value;
        }
        booking.UpdatedAt = DateTime.UtcNow;

        if (dto.ParticipantsCount.HasValue)
        {
            await RecalculateTotalsAsync(booking);
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
        return new BookingDto
        {
            Id = booking.Id,
            QuestId = booking.QuestId,
            QuestScheduleId = booking.QuestScheduleId,
            CustomerName = booking.CustomerName,
            CustomerPhone = booking.CustomerPhone,
            CustomerEmail = booking.CustomerEmail,
            BookingDate = booking.BookingDate,
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
}
