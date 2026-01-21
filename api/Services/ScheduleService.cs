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
                (rule.QuestIds.Contains(questId) || rule.QuestId == questId) &&
                rule.IsActive &&
                (rule.StartDate == null || rule.StartDate <= toDate) &&
                (rule.EndDate == null || rule.EndDate >= fromDate))
            .OrderByDescending(rule => rule.Priority)
            .ToListAsync();

        if (!rules.Any())
        {
            return 0;
        }

        var existingSlots = await _context.QuestSchedules
            .Where(slot => slot.QuestId == questId && slot.Date >= fromDate && slot.Date <= toDate)
            .ToListAsync();

        var existingByKey = existingSlots.ToDictionary(
            slot => $"{slot.Date:yyyy-MM-dd}|{slot.TimeSlot}",
            slot => slot);

        var bookedKeys = existingSlots
            .Where(slot => slot.IsBooked)
            .Select(slot => $"{slot.Date:yyyy-MM-dd}|{slot.TimeSlot}")
            .ToHashSet();

        var selectedSlots = new Dictionary<string, int>();
        var blockedSlots = new HashSet<string>();

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
                    if (bookedKeys.Contains(key))
                    {
                        var nextTime = time.AddMinutes(rule.IntervalMinutes);
                        if (nextTime <= time)
                        {
                            break;
                        }

                        time = nextTime;
                        continue;
                    }

                    if (rule.IsBlocked)
                    {
                        if (!selectedSlots.ContainsKey(key))
                        {
                            blockedSlots.Add(key);
                        }

                        var nextTime = time.AddMinutes(rule.IntervalMinutes);
                        if (nextTime <= time)
                        {
                            break;
                        }

                        time = nextTime;
                        continue;
                    }

                    if (blockedSlots.Contains(key) || selectedSlots.ContainsKey(key))
                    {
                        var nextTime = time.AddMinutes(rule.IntervalMinutes);
                        if (nextTime <= time)
                        {
                            break;
                        }

                        time = nextTime;
                        continue;
                    }

                    selectedSlots[key] = rule.Price;

                    var updatedTime = time.AddMinutes(rule.IntervalMinutes);
                    if (updatedTime <= time)
                    {
                        break;
                    }

                    time = updatedTime;
                }
            }
        }

        var newSlots = new List<QuestSchedule>();
        foreach (var (key, price) in selectedSlots)
        {
            if (existingByKey.TryGetValue(key, out var slot))
            {
                if (!slot.IsBooked && slot.Price != price)
                {
                    slot.Price = price;
                    slot.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                var parts = key.Split('|');
                var date = DateOnly.Parse(parts[0]);
                var timeSlot = TimeOnly.Parse(parts[1]);

                newSlots.Add(new QuestSchedule
                {
                    Id = Guid.NewGuid(),
                    QuestId = questId,
                    Date = date,
                    TimeSlot = timeSlot,
                    Price = price,
                    IsBooked = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        var slotsToRemove = existingSlots
            .Where(slot =>
            {
                var key = $"{slot.Date:yyyy-MM-dd}|{slot.TimeSlot}";
                return !slot.IsBooked && !selectedSlots.ContainsKey(key);
            })
            .ToList();

        if (slotsToRemove.Any())
        {
            _context.QuestSchedules.RemoveRange(slotsToRemove);
        }

        if (newSlots.Any())
        {
            _context.QuestSchedules.AddRange(newSlots);
        }

        if (newSlots.Any() || slotsToRemove.Any() || existingSlots.Any(slot => _context.Entry(slot).State == EntityState.Modified))
        {
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
            CreatedAt = slot.CreatedAt,
            UpdatedAt = slot.UpdatedAt
        };
    }
}
