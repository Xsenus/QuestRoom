using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.MirKvestov;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/mir-kvestov")]
public class MirKvestovController : ControllerBase
{
    private readonly IMirKvestovIntegrationService _integrationService;
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IApiRequestLogService _requestLogService;
    private static readonly string[] DefaultScheduleFields =
    {
        "date",
        "time",
        "is_free",
        "price",
        "discount_price",
        "your_slot_id"
    };
    private const int DefaultScheduleDaysAhead = 14;
    private const string DefaultTimeZone = "Asia/Krasnoyarsk";

    public MirKvestovController(
        IMirKvestovIntegrationService integrationService,
        AppDbContext context,
        IConfiguration configuration,
        IApiRequestLogService requestLogService)
    {
        _integrationService = integrationService;
        _context = context;
        _configuration = configuration;
        _requestLogService = requestLogService;
    }

    [HttpGet("{questSlug}")]
    [HttpGet("{questSlug}.json")]
    public async Task<ActionResult<IEnumerable<IDictionary<string, object?>>>> GetSchedule(
        string questSlug,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        await _requestLogService.LogMirKvestovAsync(
            Request.Path,
            Request.Method,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.QueryString.Value,
            null,
            HttpContext.RequestAborted);

        var settings = await GetScheduleSettingsAsync(HttpContext.RequestAborted);
        var today = GetLocalToday(settings.TimeZone);
        var fromDate = ParseDateOrDefault(from, today);
        var scheduleDaysAhead = settings.ScheduleDaysAhead > 0
            ? settings.ScheduleDaysAhead
            : DefaultScheduleDaysAhead;
        var toDate = ParseDateOrDefault(to, fromDate.AddDays(scheduleDaysAhead - 1));

        var schedule = await _integrationService.GetScheduleAsync(questSlug, fromDate, toDate, HttpContext.RequestAborted);
        var fields = settings.ScheduleFields;
        var response = schedule
            .Select(slot => BuildSchedulePayload(slot, fields))
            .ToList();
        return Ok(response);
    }

    [HttpPost("{questSlug}")]
    [HttpPost("{questSlug}.json")]
    [HttpPost("{questSlug}/order")]
    [HttpPost("{questSlug}.json/order")]
    public async Task<IActionResult> CreateOrder(string questSlug)
    {
        var request = await MirKvestovOrderRequestReader.ReadOrderRequestAsync(
            Request,
            HttpContext.RequestAborted);
        var payload = request == null
            ? await MirKvestovOrderRequestReader.ReadBodyAsync(
                Request,
                HttpContext.RequestAborted)
            : JsonSerializer.Serialize(
                request,
                new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
                });
        await _requestLogService.LogMirKvestovAsync(
            Request.Path,
            Request.Method,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.QueryString.Value,
            payload,
            HttpContext.RequestAborted);
        if (request == null)
        {
            return Ok(new { success = false, message = "Некорректный запрос" });
        }

        var result = await _integrationService.CreateBookingAsync(
            questSlug,
            request,
            HttpContext.RequestAborted);

        if (result.Success)
        {
            return Ok(new { success = true });
        }

        return Ok(new { success = false, message = result.Message ?? "Ошибка" });
    }

    [HttpGet("{questSlug}/get_price")]
    [HttpGet("{questSlug}.json/get_price")]
    public async Task<IActionResult> GetTariffs(
        string questSlug,
        [FromQuery] string date,
        [FromQuery] string time)
    {
        await _requestLogService.LogMirKvestovAsync(
            Request.Path,
            Request.Method,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.QueryString.Value,
            null,
            HttpContext.RequestAborted);

        if (!TryParseDateTime(date, time, out var dateOnly, out var timeOnly))
        {
            return BadRequest(new { message = "Некорректные дата или время" });
        }

        var tariffs = await _integrationService.GetTariffsAsync(
            questSlug,
            dateOnly,
            timeOnly,
            HttpContext.RequestAborted);
        return Ok(tariffs);
    }

    [HttpGet("{questSlug}/prepay")]
    [HttpGet("{questSlug}.json/prepay")]
    public async Task<IActionResult> Prepay(
        string questSlug,
        [FromQuery] string md5,
        [FromQuery(Name = "unique_id")] string uniqueId,
        [FromQuery] int prepay)
    {
        await _requestLogService.LogMirKvestovAsync(
            Request.Path,
            Request.Method,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.QueryString.Value,
            null,
            HttpContext.RequestAborted);

        var isValid = await _integrationService.HandlePrepayAsync(
            questSlug,
            md5,
            uniqueId,
            prepay,
            HttpContext.RequestAborted);

        if (!isValid)
        {
            return Ok(new { success = false });
        }

        return Content("{\"success\":true}", "application/json");
    }

    private static bool TryParseDateTime(string dateValue, string timeValue, out DateOnly date, out TimeOnly time)
    {
        date = default;
        time = default;

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

    private DateOnly ParseDateOrDefault(string? value, DateOnly fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        return DateOnly.TryParseExact(
            value,
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var parsed)
            ? parsed
            : fallback;
    }

    private DateOnly GetLocalToday(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            timeZoneId = DefaultTimeZone;
        }

        var timeZone = ResolveTimeZone(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        return DateOnly.FromDateTime(localNow);
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

    private async Task<MirKvestovScheduleSettingsSnapshot> GetScheduleSettingsAsync(
        CancellationToken cancellationToken)
    {
        var settings = await _context.Settings
            .AsNoTracking()
            .Select(s => new
            {
                s.MirKvestovScheduleDaysAhead,
                s.MirKvestovScheduleFields,
                s.TimeZone
            })
            .FirstOrDefaultAsync(cancellationToken);

        var timeZone = string.IsNullOrWhiteSpace(settings?.TimeZone)
            ? _configuration["MirKvestov:TimeZone"]
            : settings.TimeZone;

        return new MirKvestovScheduleSettingsSnapshot(
            settings?.MirKvestovScheduleDaysAhead ?? DefaultScheduleDaysAhead,
            ParseScheduleFields(settings?.MirKvestovScheduleFields),
            string.IsNullOrWhiteSpace(timeZone) ? DefaultTimeZone : timeZone);
    }

    private static IReadOnlySet<string> ParseScheduleFields(string? fields)
    {
        if (string.IsNullOrWhiteSpace(fields))
        {
            return new HashSet<string>(DefaultScheduleFields, StringComparer.OrdinalIgnoreCase);
        }

        var parsed = fields
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(field => field.ToLowerInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (parsed.Count == 0)
        {
            return new HashSet<string>(DefaultScheduleFields, StringComparer.OrdinalIgnoreCase);
        }

        return parsed;
    }

    private static IDictionary<string, object?> BuildSchedulePayload(
        MirKvestovScheduleSlotDto slot,
        IReadOnlySet<string> fields)
    {
        var payload = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        if (fields.Contains("date"))
        {
            payload["date"] = slot.Date;
        }
        if (fields.Contains("time"))
        {
            payload["time"] = slot.Time;
        }
        if (fields.Contains("is_free"))
        {
            payload["is_free"] = slot.IsFree;
        }
        if (fields.Contains("price"))
        {
            payload["price"] = slot.Price;
        }
        if (fields.Contains("discount_price"))
        {
            payload["discount_price"] = slot.DiscountPrice;
        }
        if (fields.Contains("your_slot_id"))
        {
            payload["your_slot_id"] = slot.YourSlotId;
        }

        return payload;
    }

    private sealed record MirKvestovScheduleSettingsSnapshot(
        int ScheduleDaysAhead,
        IReadOnlySet<string> ScheduleFields,
        string? TimeZone);
}
