using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.QuestScheduleConfig;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IQuestScheduleConfigService
{
    Task<QuestScheduleConfigDto> GetConfigAsync(Guid questId);
    Task<QuestScheduleConfigDto> UpdateConfigAsync(Guid questId, QuestScheduleConfigUpsertDto config);
}

public class QuestScheduleConfigService : IQuestScheduleConfigService
{
    private readonly AppDbContext _context;

    public QuestScheduleConfigService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<QuestScheduleConfigDto> GetConfigAsync(Guid questId)
    {
        var weeklySlots = await _context.QuestWeeklySlots
            .Where(slot => slot.QuestId == questId)
            .OrderBy(slot => slot.DayOfWeek)
            .ThenBy(slot => slot.TimeSlot)
            .ToListAsync();

        var overrides = await _context.QuestDateOverrides
            .Include(overrideDay => overrideDay.Slots)
            .Where(overrideDay => overrideDay.QuestId == questId)
            .OrderBy(overrideDay => overrideDay.Date)
            .ToListAsync();

        return new QuestScheduleConfigDto
        {
            QuestId = questId,
            WeeklySlots = weeklySlots.Select(ToWeeklySlotDto).ToList(),
            DateOverrides = overrides.Select(ToOverrideDto).ToList()
        };
    }

    public async Task<QuestScheduleConfigDto> UpdateConfigAsync(Guid questId, QuestScheduleConfigUpsertDto config)
    {
        var now = DateTime.UtcNow;

        var existingWeekly = await _context.QuestWeeklySlots
            .Where(slot => slot.QuestId == questId)
            .ToListAsync();

        var weeklyById = existingWeekly.ToDictionary(slot => slot.Id, slot => slot);
        var incomingWeeklyIds = new HashSet<Guid>();

        foreach (var slot in config.WeeklySlots)
        {
            var timeSlot = ParseTime(slot.TimeSlot);
            if (slot.Id.HasValue && weeklyById.TryGetValue(slot.Id.Value, out var existing))
            {
                existing.DayOfWeek = slot.DayOfWeek;
                existing.TimeSlot = timeSlot;
                existing.Price = slot.Price;
                existing.HolidayPrice = slot.HolidayPrice;
                existing.UpdatedAt = now;
                incomingWeeklyIds.Add(existing.Id);
            }
            else
            {
                var created = new QuestWeeklySlot
                {
                    Id = Guid.NewGuid(),
                    QuestId = questId,
                    DayOfWeek = slot.DayOfWeek,
                    TimeSlot = timeSlot,
                    Price = slot.Price,
                    HolidayPrice = slot.HolidayPrice,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.QuestWeeklySlots.Add(created);
                incomingWeeklyIds.Add(created.Id);
            }
        }

        var weeklyToRemove = existingWeekly.Where(slot => !incomingWeeklyIds.Contains(slot.Id)).ToList();
        if (weeklyToRemove.Any())
        {
            _context.QuestWeeklySlots.RemoveRange(weeklyToRemove);
        }

        var existingOverrides = await _context.QuestDateOverrides
            .Include(overrideDay => overrideDay.Slots)
            .Where(overrideDay => overrideDay.QuestId == questId)
            .ToListAsync();

        var overridesById = existingOverrides.ToDictionary(overrideDay => overrideDay.Id, overrideDay => overrideDay);
        var incomingOverrideIds = new HashSet<Guid>();

        foreach (var overrideDay in config.DateOverrides)
        {
            QuestDateOverride target;
            if (overrideDay.Id.HasValue && overridesById.TryGetValue(overrideDay.Id.Value, out var existingOverride))
            {
                target = existingOverride;
                target.Date = overrideDay.Date;
                target.IsClosed = overrideDay.IsClosed;
                target.UpdatedAt = now;
            }
            else
            {
                target = new QuestDateOverride
                {
                    Id = Guid.NewGuid(),
                    QuestId = questId,
                    Date = overrideDay.Date,
                    IsClosed = overrideDay.IsClosed,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.QuestDateOverrides.Add(target);
            }

            incomingOverrideIds.Add(target.Id);
            SyncOverrideSlots(target, overrideDay, now);
        }

        var overridesToRemove = existingOverrides.Where(overrideDay => !incomingOverrideIds.Contains(overrideDay.Id)).ToList();
        if (overridesToRemove.Any())
        {
            _context.QuestDateOverrides.RemoveRange(overridesToRemove);
        }

        await _context.SaveChangesAsync();

        return await GetConfigAsync(questId);
    }

    private void SyncOverrideSlots(QuestDateOverride target, QuestDateOverrideUpsertDto overrideDay, DateTime now)
    {
        if (overrideDay.IsClosed)
        {
            if (target.Slots.Any())
            {
                _context.QuestDateOverrideSlots.RemoveRange(target.Slots);
                target.Slots.Clear();
            }
            return;
        }

        var slotsById = target.Slots.ToDictionary(slot => slot.Id, slot => slot);
        var incomingIds = new HashSet<Guid>();

        foreach (var slot in overrideDay.Slots)
        {
            var timeSlot = ParseTime(slot.TimeSlot);
            if (slot.Id.HasValue && slotsById.TryGetValue(slot.Id.Value, out var existingSlot))
            {
                existingSlot.TimeSlot = timeSlot;
                existingSlot.Price = slot.Price;
                existingSlot.UpdatedAt = now;
                incomingIds.Add(existingSlot.Id);
            }
            else
            {
                var created = new QuestDateOverrideSlot
                {
                    Id = Guid.NewGuid(),
                    OverrideId = target.Id,
                    TimeSlot = timeSlot,
                    Price = slot.Price,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _context.QuestDateOverrideSlots.Add(created);
                incomingIds.Add(created.Id);
            }
        }

        var toRemove = target.Slots.Where(slot => !incomingIds.Contains(slot.Id)).ToList();
        if (toRemove.Any())
        {
            _context.QuestDateOverrideSlots.RemoveRange(toRemove);
        }
    }

    private static QuestWeeklySlotDto ToWeeklySlotDto(QuestWeeklySlot slot)
    {
        return new QuestWeeklySlotDto
        {
            Id = slot.Id,
            QuestId = slot.QuestId,
            DayOfWeek = slot.DayOfWeek,
            TimeSlot = FormatTime(slot.TimeSlot),
            Price = slot.Price,
            HolidayPrice = slot.HolidayPrice
        };
    }

    private static QuestDateOverrideDto ToOverrideDto(QuestDateOverride overrideDay)
    {
        return new QuestDateOverrideDto
        {
            Id = overrideDay.Id,
            QuestId = overrideDay.QuestId,
            Date = overrideDay.Date,
            IsClosed = overrideDay.IsClosed,
            Slots = overrideDay.Slots
                .OrderBy(slot => slot.TimeSlot)
                .Select(slot => new QuestDateOverrideSlotDto
                {
                    Id = slot.Id,
                    TimeSlot = FormatTime(slot.TimeSlot),
                    Price = slot.Price
                })
                .ToList()
        };
    }

    private static TimeOnly ParseTime(string value)
    {
        return TimeOnly.Parse(value);
    }

    private static string FormatTime(TimeOnly value)
    {
        return value.ToString("HH:mm");
    }
}
