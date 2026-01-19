using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Schedule;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IScheduleService
{
    Task<IReadOnlyList<QuestScheduleDto>> GetScheduleForQuestAsync(Guid questId, DateOnly? fromDate, DateOnly? toDate);
    Task<QuestScheduleDto> CreateSlotAsync(QuestScheduleUpsertDto dto);
    Task<bool> UpdateSlotAsync(Guid id, QuestScheduleUpsertDto dto);
}

public class ScheduleService : IScheduleService
{
    private readonly AppDbContext _context;

    public ScheduleService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<QuestScheduleDto>> GetScheduleForQuestAsync(
        Guid questId,
        DateOnly? fromDate,
        DateOnly? toDate)
    {
        var query = _context.QuestSchedules.Where(s => s.QuestId == questId);

        if (fromDate.HasValue)
        {
            query = query.Where(s => s.Date >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(s => s.Date <= toDate.Value);
        }

        return await query
            .OrderBy(s => s.Date)
            .ThenBy(s => s.TimeSlot)
            .Select(s => ToDto(s))
            .ToListAsync();
    }

    public async Task<QuestScheduleDto> CreateSlotAsync(QuestScheduleUpsertDto dto)
    {
        var slot = new QuestSchedule
        {
            Id = Guid.NewGuid(),
            QuestId = dto.QuestId,
            Date = dto.Date,
            TimeSlot = dto.TimeSlot,
            Price = dto.Price,
            IsBooked = dto.IsBooked,
            BookingId = dto.BookingId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.QuestSchedules.Add(slot);
        await _context.SaveChangesAsync();

        return ToDto(slot);
    }

    public async Task<bool> UpdateSlotAsync(Guid id, QuestScheduleUpsertDto dto)
    {
        var slot = await _context.QuestSchedules.FindAsync(id);
        if (slot == null)
        {
            return false;
        }

        slot.QuestId = dto.QuestId;
        slot.Date = dto.Date;
        slot.TimeSlot = dto.TimeSlot;
        slot.Price = dto.Price;
        slot.IsBooked = dto.IsBooked;
        slot.BookingId = dto.BookingId;
        slot.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    private static QuestScheduleDto ToDto(QuestSchedule slot)
    {
        return new QuestScheduleDto
        {
            Id = slot.Id,
            QuestId = slot.QuestId,
            Date = slot.Date,
            TimeSlot = slot.TimeSlot,
            Price = slot.Price,
            IsBooked = slot.IsBooked,
            BookingId = slot.BookingId,
            CreatedAt = slot.CreatedAt,
            UpdatedAt = slot.UpdatedAt
        };
    }
}
