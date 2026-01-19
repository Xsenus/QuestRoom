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

    public BookingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<BookingDto>> GetBookingsAsync()
    {
        return await _context.Bookings
            .OrderBy(b => b.BookingDate)
            .Select(b => ToDto(b))
            .ToListAsync();
    }

    public async Task<BookingDto> CreateBookingAsync(BookingCreateDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                QuestId = dto.QuestId,
                QuestScheduleId = dto.QuestScheduleId,
                CustomerName = dto.CustomerName,
                CustomerPhone = dto.CustomerPhone,
                CustomerEmail = dto.CustomerEmail,
                BookingDate = dto.BookingDate,
                ParticipantsCount = dto.ParticipantsCount,
                Status = "pending",
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            if (booking.QuestScheduleId.HasValue)
            {
                var schedule = await _context.QuestSchedules.FindAsync(booking.QuestScheduleId.Value);
                if (schedule != null)
                {
                    schedule.IsBooked = true;
                    schedule.BookingId = booking.Id;
                    schedule.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            await transaction.CommitAsync();
            return ToDto(booking);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateBookingAsync(Guid id, BookingUpdateDto dto)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return false;
        }

        booking.Status = dto.Status;
        booking.Notes = dto.Notes;
        booking.UpdatedAt = DateTime.UtcNow;

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
                    schedule.BookingId = null;
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
            Status = booking.Status,
            Notes = booking.Notes,
            CreatedAt = booking.CreatedAt,
            UpdatedAt = booking.UpdatedAt
        };
    }
}
