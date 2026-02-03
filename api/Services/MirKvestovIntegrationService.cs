using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.DTOs.MirKvestov;
using QuestRoomApi.DTOs.Schedule;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public record MirKvestovBookingResult(bool Success, string? Message = null);

public interface IMirKvestovIntegrationService
{
    Task<IReadOnlyList<MirKvestovScheduleSlotDto>> GetScheduleAsync(
        string questSlug,
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default);

    Task<MirKvestovBookingResult> CreateBookingAsync(
        string questSlug,
        MirKvestovOrderRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyDictionary<string, int>> GetTariffsAsync(
        string questSlug,
        DateOnly date,
        TimeOnly time,
        CancellationToken cancellationToken = default);

    Task<bool> HandlePrepayAsync(
        string questSlug,
        string md5,
        string uniqueId,
        int prepay,
        CancellationToken cancellationToken = default);
}

public class MirKvestovIntegrationService : IMirKvestovIntegrationService
{
    private readonly AppDbContext _context;
    private readonly IScheduleService _scheduleService;
    private readonly IBookingService _bookingService;
    private readonly IConfiguration _configuration;
    private const string SlotIdFormatGuid = "guid";
    private const string SlotIdFormatNumeric = "numeric";
    private const string DefaultTimeZone = "Asia/Krasnoyarsk";

    public MirKvestovIntegrationService(
        AppDbContext context,
        IScheduleService scheduleService,
        IBookingService bookingService,
        IConfiguration configuration)
    {
        _context = context;
        _scheduleService = scheduleService;
        _bookingService = bookingService;
        _configuration = configuration;
    }

    public async Task<IReadOnlyList<MirKvestovScheduleSlotDto>> GetScheduleAsync(
        string questSlug,
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        var quest = await _context.Quests
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Slug == questSlug, cancellationToken);
        if (quest == null)
        {
            return Array.Empty<MirKvestovScheduleSlotDto>();
        }

        var settings = await GetSettingsSnapshotAsync(cancellationToken);
        var schedule = await _scheduleService.GetScheduleForQuestAsync(quest.Id, fromDate, toDate);
        var now = GetLocalNow(settings.TimeZone);
        var cutoffMinutes = await GetBookingCutoffMinutesAsync(cancellationToken);
        var cutoffTime = now.AddMinutes(cutoffMinutes);
        var slotIdFormat = NormalizeSlotIdFormat(settings.SlotIdFormat);

        return schedule
            .OrderBy(slot => slot.Date)
            .ThenBy(slot => slot.TimeSlot)
            .Select(slot =>
            {
                var slotDateTime = slot.Date.ToDateTime(slot.TimeSlot);
                var isFuture = slotDateTime > cutoffTime;
                return new MirKvestovScheduleSlotDto
                {
                    Date = slot.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Time = slot.TimeSlot.ToString("HH:mm", CultureInfo.InvariantCulture),
                    IsFree = !slot.IsBooked && isFuture,
                    Price = slot.Price,
                    DiscountPrice = null,
                    YourSlotId = BuildSlotId(slot, slotIdFormat)
                };
            })
            .ToList();
    }

    public async Task<MirKvestovBookingResult> CreateBookingAsync(
        string questSlug,
        MirKvestovOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var settings = await GetSettingsSnapshotAsync(cancellationToken);
        var quest = await _context.Quests
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Slug == questSlug, cancellationToken);
        if (quest == null)
        {
            return new MirKvestovBookingResult(false, "Квест не найден");
        }

        if (!TryParseDateTime(request.Date, request.Time, out var date, out var time))
        {
            return new MirKvestovBookingResult(false, "Некорректные дата или время");
        }

        var schedule = await ResolveScheduleAsync(quest.Id, request.YourSlotId, date, time, cancellationToken);

        if (schedule == null)
        {
            await _scheduleService.GetScheduleForQuestAsync(quest.Id, date, date);
            schedule = await ResolveScheduleAsync(quest.Id, request.YourSlotId, date, time, cancellationToken);
        }

        if (schedule == null)
        {
            return new MirKvestovBookingResult(false, "Слот не найден");
        }

        if (schedule.IsBooked)
        {
            return new MirKvestovBookingResult(false, "Указанное время занято");
        }

        var now = GetLocalNow(settings.TimeZone);
        var cutoffMinutes = await GetBookingCutoffMinutesAsync(cancellationToken);
        var cutoffTime = now.AddMinutes(cutoffMinutes);
        var slotDateTime = schedule.Date.ToDateTime(schedule.TimeSlot);
        if (slotDateTime <= cutoffTime)
        {
            return new MirKvestovBookingResult(false, "Указанное время занято");
        }

        if (!IsMd5Valid(request, settings.Md5Key))
        {
            return new MirKvestovBookingResult(false, "Ошибка проверки md5");
        }

        var customerName = BuildCustomerName(request);
        if (string.IsNullOrWhiteSpace(customerName) || string.IsNullOrWhiteSpace(request.Phone))
        {
            return new MirKvestovBookingResult(false, "Не заполнены обязательные поля");
        }

        var participantsCount = request.Players
            ?? Math.Max(1, quest.ParticipantsMin);

        var notes = BuildNotes(request);
        try
        {
            await _bookingService.CreateBookingAsync(new BookingCreateDto
            {
                QuestId = quest.Id,
                QuestScheduleId = schedule.Id,
                CustomerName = customerName,
                CustomerPhone = request.Phone ?? string.Empty,
                CustomerEmail = request.Email,
                BookingDate = date,
                ParticipantsCount = participantsCount,
                Notes = notes,
                Aggregator = "МИР КВЕСТОВ"
            });
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("забронировано", StringComparison.OrdinalIgnoreCase))
            {
                return new MirKvestovBookingResult(false, "Указанное время занято");
            }

            return new MirKvestovBookingResult(false, ex.Message);
        }

        return new MirKvestovBookingResult(true);
    }

    public async Task<IReadOnlyDictionary<string, int>> GetTariffsAsync(
        string questSlug,
        DateOnly date,
        TimeOnly time,
        CancellationToken cancellationToken = default)
    {
        var quest = await _context.Quests
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Slug == questSlug, cancellationToken);
        if (quest == null)
        {
            return new Dictionary<string, int>();
        }

        var schedule = await _context.QuestSchedules
            .AsNoTracking()
            .FirstOrDefaultAsync(
                s => s.QuestId == quest.Id && s.Date == date && s.TimeSlot == time,
                cancellationToken);

        var price = schedule?.Price ?? quest.Price;
        var label = $"Базовая цена: {price} руб.";

        return new Dictionary<string, int>
        {
            [label] = price
        };
    }

    public async Task<bool> HandlePrepayAsync(
        string questSlug,
        string md5,
        string uniqueId,
        int prepay,
        CancellationToken cancellationToken = default)
    {
        var questExists = await _context.Quests
            .AsNoTracking()
            .AnyAsync(q => q.Slug == questSlug, cancellationToken);
        if (!questExists)
        {
            return false;
        }

        var settings = await GetSettingsSnapshotAsync(cancellationToken);
        var keys = ParseMd5Keys(settings.PrepayMd5Key);
        if (keys.Count == 0)
        {
            return true;
        }

        foreach (var key in keys)
        {
            var payload = $"{key}{uniqueId}{prepay}";
            var expected = ComputeMd5(payload);
            if (expected.Equals(md5, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool TryParseDateTime(string? dateValue, string? timeValue, out DateOnly date, out TimeOnly time)
    {
        date = default;
        time = default;

        if (string.IsNullOrWhiteSpace(dateValue) || string.IsNullOrWhiteSpace(timeValue))
        {
            return false;
        }

        var dateParsed = DateOnly.TryParseExact(
            dateValue,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);
        var timeParsed = TimeOnly.TryParseExact(
            timeValue,
            "HH:mm",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out time);

        return dateParsed && timeParsed;
    }

    private static string BuildCustomerName(MirKvestovOrderRequest request)
    {
        var first = request.FirstName?.Trim();
        var last = request.FamilyName?.Trim();

        if (!string.IsNullOrWhiteSpace(first) && !string.IsNullOrWhiteSpace(last))
        {
            return $"{first} {last}";
        }

        return first ?? last ?? string.Empty;
    }

    private static string? BuildNotes(MirKvestovOrderRequest request)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Comment))
        {
            parts.Add($"Комментарий: {request.Comment}");
        }

        if (!string.IsNullOrWhiteSpace(request.Source))
        {
            parts.Add($"Источник: {request.Source}");
        }

        if (!string.IsNullOrWhiteSpace(request.UniqueId))
        {
            parts.Add($"Mir-kvestov unique_id: {request.UniqueId}");
        }

        if (!string.IsNullOrWhiteSpace(request.YourSlotId))
        {
            parts.Add($"your_slot_id: {request.YourSlotId}");
        }

        if (!string.IsNullOrWhiteSpace(request.Tariff))
        {
            parts.Add($"Тариф: {request.Tariff}");
        }

        if (request.Price.HasValue)
        {
            parts.Add($"Цена от агрегатора: {request.Price.Value}");
        }

        return parts.Count > 0 ? string.Join(". ", parts) : null;
    }

    private async Task<QuestSchedule?> ResolveScheduleAsync(
        Guid questId,
        string? yourSlotId,
        DateOnly date,
        TimeOnly time,
        CancellationToken cancellationToken)
    {
        if (TryParseSlotId(yourSlotId, out var slotGuid, out var slotDate, out var slotTime))
        {
            if (slotGuid.HasValue)
            {
                var schedule = await _context.QuestSchedules
                    .FirstOrDefaultAsync(s => s.Id == slotGuid.Value && s.QuestId == questId, cancellationToken);
                if (schedule != null)
                {
                    return schedule;
                }
            }

            if (slotDate.HasValue && slotTime.HasValue)
            {
                var schedule = await _context.QuestSchedules
                    .FirstOrDefaultAsync(
                        s => s.QuestId == questId && s.Date == slotDate.Value && s.TimeSlot == slotTime.Value,
                        cancellationToken);
                if (schedule != null)
                {
                    return schedule;
                }
            }
        }

        return await _context.QuestSchedules
            .FirstOrDefaultAsync(
                s => s.QuestId == questId && s.Date == date && s.TimeSlot == time,
                cancellationToken);
    }

    private string BuildSlotId(QuestSchedule slot, string format)
    {
        if (string.Equals(format, SlotIdFormatNumeric, StringComparison.OrdinalIgnoreCase))
        {
            var datePart = slot.Date.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            var timePart = slot.TimeSlot.ToString("HHmm", CultureInfo.InvariantCulture);
            return $"{datePart}{timePart}";
        }

        return slot.Id.ToString();
    }

    private string BuildSlotId(QuestScheduleDto slot, string format)
    {
        if (string.Equals(format, SlotIdFormatNumeric, StringComparison.OrdinalIgnoreCase))
        {
            var datePart = slot.Date.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            var timePart = slot.TimeSlot.ToString("HHmm", CultureInfo.InvariantCulture);
            return $"{datePart}{timePart}";
        }

        return slot.Id.ToString();
    }

    private static bool TryParseSlotId(string? value, out Guid? slotGuid, out DateOnly? date, out TimeOnly? time)
    {
        slotGuid = null;
        date = null;
        time = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (Guid.TryParse(value, out var parsedGuid))
        {
            slotGuid = parsedGuid;
            return true;
        }

        var trimmed = value.Trim();
        if (trimmed.Length == 12 && trimmed.All(char.IsDigit))
        {
            var datePart = trimmed[..8];
            var timePart = trimmed[8..];
            if (DateOnly.TryParseExact(datePart, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate)
                && TimeOnly.TryParseExact(timePart, "HHmm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedTime))
            {
                date = parsedDate;
                time = parsedTime;
                return true;
            }
        }

        return false;
    }

    private bool IsMd5Valid(MirKvestovOrderRequest request, string? md5Key)
    {
        var keys = ParseMd5Keys(md5Key);
        if (keys.Count == 0)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(request.Md5))
        {
            return false;
        }

        foreach (var key in keys)
        {
            var payload = $"{request.FirstName}{request.FamilyName}{request.Phone}{request.Email}{key}";
            var expected = ComputeMd5(payload);
            if (expected.Equals(request.Md5, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string ComputeMd5(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value ?? string.Empty);
        var hash = MD5.HashData(bytes);
        var builder = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
        {
            builder.Append(b.ToString("x2", CultureInfo.InvariantCulture));
        }

        return builder.ToString();
    }

    private static List<string> ParseMd5Keys(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new List<string>();
        }

        return value
            .Split(new[] { ',', ';', '\n', '\r', '\t', ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(key => key.Trim())
            .Where(key => !string.IsNullOrWhiteSpace(key))
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    private DateTime GetLocalNow(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            timeZoneId = DefaultTimeZone;
        }

        var timeZone = ResolveTimeZone(timeZoneId);
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
    }

    private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }

    private async Task<int> GetBookingCutoffMinutesAsync(CancellationToken cancellationToken)
    {
        var cutoff = await _context.Settings
            .AsNoTracking()
            .Select(s => s.BookingCutoffMinutes)
            .FirstOrDefaultAsync(cancellationToken);
        return cutoff > 0 ? cutoff : 10;
    }

    private async Task<MirKvestovSettingsSnapshot> GetSettingsSnapshotAsync(
        CancellationToken cancellationToken)
    {
        var settings = await _context.Settings
            .AsNoTracking()
            .Select(s => new MirKvestovSettingsSnapshot(
                s.MirKvestovMd5Key,
                s.MirKvestovPrepayMd5Key,
                s.MirKvestovSlotIdFormat,
                s.TimeZone))
            .FirstOrDefaultAsync(cancellationToken);

        var md5Key = settings is null
            ? _configuration["MirKvestov:Md5Key"]
            : settings.Md5Key;
        var prepayMd5Key = settings is null
            ? _configuration["MirKvestov:PrepayMd5Key"]
            : settings.PrepayMd5Key;
        var slotIdFormat = string.IsNullOrWhiteSpace(settings?.SlotIdFormat)
            ? _configuration["MirKvestov:SlotIdFormat"]
            : settings.SlotIdFormat;
        var timeZone = string.IsNullOrWhiteSpace(settings?.TimeZone)
            ? _configuration["MirKvestov:TimeZone"]
            : settings.TimeZone;

        return new MirKvestovSettingsSnapshot(
            md5Key,
            prepayMd5Key,
            slotIdFormat,
            timeZone);
    }

    private static string NormalizeSlotIdFormat(string? format)
    {
        if (string.IsNullOrWhiteSpace(format))
        {
            return SlotIdFormatNumeric;
        }

        return format.Trim().ToLowerInvariant();
    }

    private sealed record MirKvestovSettingsSnapshot(
        string? Md5Key,
        string? PrepayMd5Key,
        string? SlotIdFormat,
        string? TimeZone);
}
