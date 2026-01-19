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
    Task<int> GenerateScheduleAsync(Guid questId, DateOnly fromDate, DateOnly toDate);
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

    public async Task<int> GenerateScheduleAsync(Guid questId, DateOnly fromDate, DateOnly toDate)
    {
        if (fromDate > toDate)
        {
            return 0;
        }

        var rules = await _context.QuestPricingRules
            .Where(rule =>
                rule.QuestId == questId &&
                rule.IsActive &&
                (rule.StartDate == null || rule.StartDate <= toDate) &&
                (rule.EndDate == null || rule.EndDate >= fromDate))
            .OrderBy(rule => rule.Priority)
            .ToListAsync();

        if (!rules.Any())
        {
            return 0;
        }

        var existingSlots = await _context.QuestSchedules
            .Where(slot => slot.QuestId == questId && slot.Date >= fromDate && slot.Date <= toDate)
            .Select(slot => new { slot.Date, slot.TimeSlot })
            .ToListAsync();

        var existingSet = existingSlots
            .Select(slot => $"{slot.Date:yyyy-MM-dd}|{slot.TimeSlot}")
            .ToHashSet();

        var newSlots = new List<QuestSchedule>();

        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            var dayOfWeek = (int)date.DayOfWeek;

            foreach (var rule in rules)
            {
                if (rule.IntervalMinutes <= 0)
                {
                    continue;
                }

                if (!rule.DaysOfWeek.Contains(dayOfWeek))
                {
                    continue;
                }

                if (rule.StartDate.HasValue && date < rule.StartDate.Value)
                {
                    continue;
                }

                if (rule.EndDate.HasValue && date > rule.EndDate.Value)
                {
                    continue;
                }

                var time = rule.StartTime;
                while (time < rule.EndTime)
                {
                    var key = $"{date:yyyy-MM-dd}|{time}";
                    if (!existingSet.Contains(key))
                    {
                        newSlots.Add(new QuestSchedule
                        {
                            Id = Guid.NewGuid(),
                            QuestId = questId,
                            Date = date,
                            TimeSlot = time,
                            Price = rule.Price,
                            IsBooked = false,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                        existingSet.Add(key);
                    }

                    time = time.AddMinutes(rule.IntervalMinutes);
                }
            }
        }

        if (newSlots.Any())
        {
            _context.QuestSchedules.AddRange(newSlots);
            await _context.SaveChangesAsync();
        }

        return newSlots.Count;
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
