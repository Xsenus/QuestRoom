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
    Task<int> GenerateScheduleAsync(Guid? questId, DateOnly fromDate, DateOnly toDate);
    Task<QuestScheduleConsistencyCheckResultDto> CheckAndRepairConsistencyAsync(Guid? questId, DateOnly fromDate, DateOnly toDate);
    Task<IReadOnlyList<QuestWeeklySlotDto>> GetWeeklySlotsAsync(Guid questId);
    Task<QuestWeeklySlotDto> CreateWeeklySlotAsync(QuestWeeklySlotUpsertDto dto);
    Task<bool> UpdateWeeklySlotAsync(Guid id, QuestWeeklySlotUpsertDto dto);
    Task<bool> DeleteWeeklySlotAsync(Guid id);
    Task<IReadOnlyList<QuestScheduleOverrideDto>> GetOverridesAsync(Guid questId, DateOnly? fromDate, DateOnly? toDate);
    Task<QuestScheduleOverrideDto> CreateOverrideAsync(QuestScheduleOverrideUpsertDto dto);
    Task<bool> UpdateOverrideAsync(Guid id, QuestScheduleOverrideUpsertDto dto);
    Task<bool> DeleteOverrideAsync(Guid id);
    Task<QuestScheduleSettingsDto> GetSettingsAsync(Guid questId);
    Task<QuestScheduleSettingsDto> UpsertSettingsAsync(QuestScheduleSettingsUpsertDto dto);
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
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(questId);
        if (fromDate.HasValue && toDate.HasValue && await ShouldUseTemplateAsync(scheduleQuestId))
        {
            await GenerateScheduleFromTemplatesAsync(scheduleQuestId, fromDate.Value, toDate.Value);
        }

        var query = _context.QuestSchedules.Where(s => s.QuestId == scheduleQuestId);

        if (fromDate.HasValue)
        {
            query = query.Where(s => s.Date >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(s => s.Date <= toDate.Value);
        }

        var slots = await query
            .OrderBy(s => s.Date)
            .ThenBy(s => s.TimeSlot)
            .Select(s => ToDto(s))
            .ToListAsync();

        if (!slots.Any())
        {
            return slots;
        }

        var slotIds = slots.Select(slot => slot.Id).ToList();
        var occupiedSlotIds = await _context.Bookings
            .Where(booking => booking.QuestScheduleId.HasValue)
            .Where(booking => booking.Status != "cancelled")
            .Where(booking => booking.QuestScheduleId != null && slotIds.Contains(booking.QuestScheduleId.Value))
            .Select(booking => booking.QuestScheduleId!.Value)
            .Distinct()
            .ToListAsync();
        var occupiedSet = occupiedSlotIds.ToHashSet();

        foreach (var slot in slots)
        {
            slot.IsBooked = slot.IsBooked || occupiedSet.Contains(slot.Id);
        }

        return slots;
    }

    public async Task<QuestScheduleDto> CreateSlotAsync(QuestScheduleUpsertDto dto)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        var slot = new QuestSchedule
        {
            Id = Guid.NewGuid(),
            QuestId = scheduleQuestId,
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

        slot.QuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        slot.Date = dto.Date;
        slot.TimeSlot = dto.TimeSlot;
        slot.Price = dto.Price;
        slot.IsBooked = dto.IsBooked;
        slot.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> GenerateScheduleAsync(Guid? questId, DateOnly fromDate, DateOnly toDate)
    {
        if (fromDate > toDate)
        {
            return 0;
        }

        var questIds = questId.HasValue
            ? new List<Guid> { await ResolveScheduleQuestIdAsync(questId.Value) }
            : await _context.Quests
                .Where(q => q.ParentQuestId == null)
                .Select(q => q.Id)
                .ToListAsync();

        if (!questIds.Any())
        {
            return 0;
        }

        var totalCreated = 0;
        foreach (var id in questIds)
        {
            totalCreated += await GenerateScheduleForQuestAsync(id, fromDate, toDate);
        }

        return totalCreated;
    }


    public async Task<QuestScheduleConsistencyCheckResultDto> CheckAndRepairConsistencyAsync(
        Guid? questId,
        DateOnly fromDate,
        DateOnly toDate)
    {
        var result = new QuestScheduleConsistencyCheckResultDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            CheckedAtUtc = DateTime.UtcNow
        };

        if (fromDate > toDate)
        {
            result.Messages.Add("Некорректный период: дата начала позже даты окончания.");
            return result;
        }

        var scheduleQuery = _context.QuestSchedules
            .Where(slot => slot.Date >= fromDate && slot.Date <= toDate);

        if (questId.HasValue)
        {
            var scheduleQuestId = await ResolveScheduleQuestIdAsync(questId.Value);
            scheduleQuery = scheduleQuery.Where(slot => slot.QuestId == scheduleQuestId);
        }

        var slots = await scheduleQuery.ToListAsync();
        result.CheckedSlots = slots.Count;

        if (!slots.Any())
        {
            result.Messages.Add("Слоты расписания за выбранный период не найдены.");
            return result;
        }

        var questIds = slots.Select(slot => slot.QuestId).Distinct().ToList();
        var questTitles = await _context.Quests
            .Where(quest => questIds.Contains(quest.Id))
            .Select(quest => new { quest.Id, quest.Title })
            .ToDictionaryAsync(quest => quest.Id, quest => quest.Title);

        var slotIds = slots.Select(slot => slot.Id).ToList();
        var blockedSlotIds = await _context.Bookings
            .Where(booking => booking.QuestScheduleId.HasValue && slotIds.Contains(booking.QuestScheduleId.Value))
            .Where(booking => booking.Status != "cancelled")
            .Select(booking => booking.QuestScheduleId!.Value)
            .Distinct()
            .ToListAsync();

        var blockedSet = blockedSlotIds.ToHashSet();

        foreach (var slot in slots)
        {
            var shouldBeBooked = blockedSet.Contains(slot.Id);
            if (slot.IsBooked == shouldBeBooked)
            {
                continue;
            }

            var previousState = slot.IsBooked;
            slot.IsBooked = shouldBeBooked;
            slot.UpdatedAt = DateTime.UtcNow;
            result.UpdatedSlots++;

            if (shouldBeBooked)
            {
                result.OccupiedSlots++;
            }
            else
            {
                result.ReleasedSlots++;
            }

            result.Logs.Add(new QuestScheduleConsistencyLogEntryDto
            {
                QuestId = slot.QuestId,
                QuestTitle = questTitles.TryGetValue(slot.QuestId, out var questTitle) ? questTitle : "Неизвестный квест",
                Date = slot.Date,
                TimeSlot = slot.TimeSlot,
                PreviousIsBooked = previousState,
                CurrentIsBooked = shouldBeBooked,
                Issue = previousState
                    ? "Слот был помечен занятым, но не имел активных бронирований."
                    : "Слот был свободным, но имел активные бронирования.",
                Resolution = shouldBeBooked
                    ? "Слот помечен как занятый."
                    : "Слот освобожден."
            });
        }

        result.OrphanBookings = await _context.Bookings
            .Where(booking => booking.QuestScheduleId.HasValue)
            .Where(booking => booking.Status != "cancelled")
            .Where(booking => !_context.QuestSchedules.Any(slot => slot.Id == booking.QuestScheduleId))
            .CountAsync();

        if (result.OrphanBookings > 0)
        {
            result.Logs.Add(new QuestScheduleConsistencyLogEntryDto
            {
                QuestTitle = "Системная проверка",
                Issue = "Найдены бронирования, ссылающиеся на отсутствующие слоты расписания.",
                Resolution = $"Количество проблемных бронирований: {result.OrphanBookings}.",
                Source = "orphan-bookings"
            });
        }

        if (result.UpdatedSlots > 0)
        {
            await _context.SaveChangesAsync();
            result.Messages.Add($"Исправлено слотов: {result.UpdatedSlots}.");
            result.Messages.Add($"Освобождено слотов: {result.ReleasedSlots}.");
            result.Messages.Add($"Помечено занятыми: {result.OccupiedSlots}.");
        }
        else
        {
            result.Messages.Add("Расхождений по занятости слотов не найдено.");
        }

        if (result.OrphanBookings > 0)
        {
            result.Messages.Add($"Найдены бронирования без существующего слота расписания: {result.OrphanBookings}.");
        }

        return result;
    }
    private async Task<int> GenerateScheduleForQuestAsync(Guid questId, DateOnly fromDate, DateOnly toDate)
    {
        if (await ShouldUseTemplateAsync(questId))
        {
            return await GenerateScheduleFromTemplatesAsync(questId, fromDate, toDate);
        }

        return await GenerateScheduleFromPricingRulesAsync(questId, fromDate, toDate);
    }

    private async Task<int> GenerateScheduleFromPricingRulesAsync(Guid questId, DateOnly fromDate, DateOnly toDate)
    {
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

    private async Task<bool> ShouldUseTemplateAsync(Guid questId)
    {
        return await _context.QuestWeeklySlots.AnyAsync(slot => slot.QuestId == questId)
               || await _context.QuestScheduleOverrides.AnyAsync(overrideDay => overrideDay.QuestId == questId);
    }

    private async Task<int> GenerateScheduleFromTemplatesAsync(Guid questId, DateOnly fromDate, DateOnly toDate)
    {
        if (fromDate > toDate)
        {
            return 0;
        }

        var weeklySlots = await _context.QuestWeeklySlots
            .Where(slot => slot.QuestId == questId)
            .OrderBy(slot => slot.DayOfWeek)
            .ThenBy(slot => slot.TimeSlot)
            .ToListAsync();

        var settings = await _context.QuestScheduleSettings
            .FirstOrDefaultAsync(entry => entry.QuestId == questId);

        var overrides = await _context.QuestScheduleOverrides
            .Where(overrideDay => overrideDay.QuestId == questId && overrideDay.Date >= fromDate && overrideDay.Date <= toDate)
            .Include(overrideDay => overrideDay.Slots)
            .ToListAsync();

        if (!weeklySlots.Any() && !overrides.Any())
        {
            return 0;
        }

        var overridesByDate = overrides.ToDictionary(overrideDay => overrideDay.Date, overrideDay => overrideDay);
        var weeklyByDay = weeklySlots
            .GroupBy(slot => slot.DayOfWeek)
            .ToDictionary(group => group.Key, group => group.ToList());

        var holidayDates = await _context.ProductionCalendarDays
            .Where(day => day.Date >= fromDate && day.Date <= toDate && day.IsHoliday)
            .Select(day => day.Date)
            .ToListAsync();

        var holidaySet = holidayDates
            .Where(date => date.DayOfWeek != DayOfWeek.Saturday && date.DayOfWeek != DayOfWeek.Sunday)
            .ToHashSet();

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

        for (var date = fromDate; date <= toDate; date = date.AddDays(1))
        {
            if (overridesByDate.TryGetValue(date, out var overrideDay))
            {
                if (overrideDay.IsClosed)
                {
                    continue;
                }

                foreach (var slot in overrideDay.Slots)
                {
                    var key = $"{date:yyyy-MM-dd}|{slot.TimeSlot}";
                    if (bookedKeys.Contains(key))
                    {
                        continue;
                    }

                    selectedSlots[key] = slot.Price;
                }

                continue;
            }

            if (!weeklyByDay.TryGetValue((int)date.DayOfWeek, out var slotsForDay))
            {
                continue;
            }

            var isHoliday = holidaySet.Contains(date);

            foreach (var slot in slotsForDay)
            {
                var key = $"{date:yyyy-MM-dd}|{slot.TimeSlot}";
                if (bookedKeys.Contains(key))
                {
                    continue;
                }

                var price = isHoliday ? settings?.HolidayPrice ?? slot.Price : slot.Price;
                selectedSlots[key] = price;
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

    public async Task<IReadOnlyList<QuestWeeklySlotDto>> GetWeeklySlotsAsync(Guid questId)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(questId);
        return await _context.QuestWeeklySlots
            .Where(slot => slot.QuestId == scheduleQuestId)
            .OrderBy(slot => slot.DayOfWeek)
            .ThenBy(slot => slot.TimeSlot)
            .Select(slot => new QuestWeeklySlotDto
            {
                Id = slot.Id,
                QuestId = scheduleQuestId,
                DayOfWeek = slot.DayOfWeek,
                TimeSlot = slot.TimeSlot,
                Price = slot.Price,
                CreatedAt = slot.CreatedAt,
                UpdatedAt = slot.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<QuestWeeklySlotDto> CreateWeeklySlotAsync(QuestWeeklySlotUpsertDto dto)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        var slot = new QuestWeeklySlot
        {
            Id = Guid.NewGuid(),
            QuestId = scheduleQuestId,
            DayOfWeek = dto.DayOfWeek,
            TimeSlot = dto.TimeSlot,
            Price = dto.Price,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.QuestWeeklySlots.Add(slot);
        await _context.SaveChangesAsync();

        return new QuestWeeklySlotDto
        {
            Id = slot.Id,
            QuestId = scheduleQuestId,
            DayOfWeek = slot.DayOfWeek,
            TimeSlot = slot.TimeSlot,
            Price = slot.Price,
            CreatedAt = slot.CreatedAt,
            UpdatedAt = slot.UpdatedAt
        };
    }

    public async Task<bool> UpdateWeeklySlotAsync(Guid id, QuestWeeklySlotUpsertDto dto)
    {
        var slot = await _context.QuestWeeklySlots.FindAsync(id);
        if (slot == null)
        {
            return false;
        }

        slot.QuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        slot.DayOfWeek = dto.DayOfWeek;
        slot.TimeSlot = dto.TimeSlot;
        slot.Price = dto.Price;
        slot.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteWeeklySlotAsync(Guid id)
    {
        var slot = await _context.QuestWeeklySlots.FindAsync(id);
        if (slot == null)
        {
            return false;
        }

        _context.QuestWeeklySlots.Remove(slot);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<QuestScheduleOverrideDto>> GetOverridesAsync(
        Guid questId,
        DateOnly? fromDate,
        DateOnly? toDate)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(questId);
        var query = _context.QuestScheduleOverrides
            .Where(overrideDay => overrideDay.QuestId == scheduleQuestId)
            .Include(overrideDay => overrideDay.Slots)
            .AsQueryable();

        if (fromDate.HasValue)
        {
            query = query.Where(overrideDay => overrideDay.Date >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(overrideDay => overrideDay.Date <= toDate.Value);
        }

        var overrides = await query
            .OrderBy(overrideDay => overrideDay.Date)
            .ToListAsync();

        return overrides.Select(ToOverrideDto).ToList();
    }

    public async Task<QuestScheduleOverrideDto> CreateOverrideAsync(QuestScheduleOverrideUpsertDto dto)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        var existing = await _context.QuestScheduleOverrides
            .FirstOrDefaultAsync(overrideDay => overrideDay.QuestId == scheduleQuestId && overrideDay.Date == dto.Date);

        if (existing != null)
        {
            throw new InvalidOperationException("Для этой даты уже есть переопределение.");
        }

        var overrideDayEntity = new QuestScheduleOverride
        {
            Id = Guid.NewGuid(),
            QuestId = scheduleQuestId,
            Date = dto.Date,
            IsClosed = dto.IsClosed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Slots = BuildOverrideSlots(dto)
        };

        _context.QuestScheduleOverrides.Add(overrideDayEntity);
        await _context.SaveChangesAsync();

        return ToOverrideDto(overrideDayEntity);
    }

    public async Task<bool> UpdateOverrideAsync(Guid id, QuestScheduleOverrideUpsertDto dto)
    {
        var overrideDayEntity = await _context.QuestScheduleOverrides
            .Include(overrideDay => overrideDay.Slots)
            .FirstOrDefaultAsync(overrideDay => overrideDay.Id == id);

        if (overrideDayEntity == null)
        {
            return false;
        }

        var scheduleQuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        var duplicate = await _context.QuestScheduleOverrides
            .FirstOrDefaultAsync(overrideDay =>
                overrideDay.QuestId == scheduleQuestId &&
                overrideDay.Date == dto.Date &&
                overrideDay.Id != id);

        if (duplicate != null)
        {
            throw new InvalidOperationException("Для этой даты уже есть переопределение.");
        }

        overrideDayEntity.QuestId = scheduleQuestId;
        overrideDayEntity.Date = dto.Date;
        overrideDayEntity.IsClosed = dto.IsClosed;
        overrideDayEntity.UpdatedAt = DateTime.UtcNow;

        overrideDayEntity.Slots.Clear();
        foreach (var slot in BuildOverrideSlots(dto))
        {
            overrideDayEntity.Slots.Add(slot);
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteOverrideAsync(Guid id)
    {
        var overrideDayEntity = await _context.QuestScheduleOverrides.FindAsync(id);
        if (overrideDayEntity == null)
        {
            return false;
        }

        _context.QuestScheduleOverrides.Remove(overrideDayEntity);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<QuestScheduleSettingsDto> GetSettingsAsync(Guid questId)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(questId);
        var settings = await _context.QuestScheduleSettings
            .FirstOrDefaultAsync(entry => entry.QuestId == scheduleQuestId);

        if (settings == null)
        {
            return new QuestScheduleSettingsDto
            {
                Id = Guid.Empty,
                QuestId = scheduleQuestId,
                HolidayPrice = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
        }

        return new QuestScheduleSettingsDto
        {
            Id = settings.Id,
            QuestId = settings.QuestId,
            HolidayPrice = settings.HolidayPrice,
            CreatedAt = settings.CreatedAt,
            UpdatedAt = settings.UpdatedAt
        };
    }

    public async Task<QuestScheduleSettingsDto> UpsertSettingsAsync(QuestScheduleSettingsUpsertDto dto)
    {
        var scheduleQuestId = await ResolveScheduleQuestIdAsync(dto.QuestId);
        var settings = await _context.QuestScheduleSettings
            .FirstOrDefaultAsync(entry => entry.QuestId == scheduleQuestId);

        if (settings == null)
        {
            settings = new QuestScheduleSettings
            {
                Id = Guid.NewGuid(),
                QuestId = scheduleQuestId,
                HolidayPrice = dto.HolidayPrice,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.QuestScheduleSettings.Add(settings);
        }
        else
        {
            settings.HolidayPrice = dto.HolidayPrice;
            settings.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new QuestScheduleSettingsDto
        {
            Id = settings.Id,
            QuestId = settings.QuestId,
            HolidayPrice = settings.HolidayPrice,
            CreatedAt = settings.CreatedAt,
            UpdatedAt = settings.UpdatedAt
        };
    }

    private static QuestScheduleOverrideDto ToOverrideDto(QuestScheduleOverride overrideDay)
    {
        return new QuestScheduleOverrideDto
        {
            Id = overrideDay.Id,
            QuestId = overrideDay.QuestId,
            Date = overrideDay.Date,
            IsClosed = overrideDay.IsClosed,
            Slots = overrideDay.Slots
                .OrderBy(slot => slot.TimeSlot)
                .Select(slot => new QuestScheduleOverrideSlotDto
                {
                    Id = slot.Id,
                    TimeSlot = slot.TimeSlot,
                    Price = slot.Price
                })
                .ToList(),
            CreatedAt = overrideDay.CreatedAt,
            UpdatedAt = overrideDay.UpdatedAt
        };
    }

    private static List<QuestScheduleOverrideSlot> BuildOverrideSlots(QuestScheduleOverrideUpsertDto dto)
    {
        if (dto.IsClosed)
        {
            return new List<QuestScheduleOverrideSlot>();
        }

        var usedTimes = new HashSet<TimeOnly>();
        var result = new List<QuestScheduleOverrideSlot>();

        foreach (var slot in dto.Slots.OrderBy(slot => slot.TimeSlot))
        {
            if (!usedTimes.Add(slot.TimeSlot))
            {
                continue;
            }

            result.Add(new QuestScheduleOverrideSlot
            {
                Id = Guid.NewGuid(),
                TimeSlot = slot.TimeSlot,
                Price = slot.Price,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return result;
    }

    private async Task<Guid> ResolveScheduleQuestIdAsync(Guid questId)
    {
        var currentId = questId;
        var visited = new HashSet<Guid>();

        while (true)
        {
            if (!visited.Add(currentId))
            {
                return questId;
            }

            var parentId = await _context.Quests
                .AsNoTracking()
                .Where(q => q.Id == currentId)
                .Select(q => q.ParentQuestId)
                .FirstOrDefaultAsync();

            if (!parentId.HasValue)
            {
                return currentId;
            }

            currentId = parentId.Value;
        }
    }
}
