using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
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

    [HttpPost("{questSlug}/order")]
    [HttpPost("{questSlug}.json/order")]
    public async Task<IActionResult> CreateOrder(string questSlug)
    {
        var request = await ReadOrderRequestAsync();
        var payload = request == null
            ? await ReadBodyAsync()
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

    private async Task<MirKvestovOrderRequest?> ReadOrderRequestAsync()
    {
        Request.EnableBuffering();

        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            return BuildOrderRequest(form);
        }

        var rawBody = await ReadBodyAsync();
        if (!string.IsNullOrWhiteSpace(rawBody))
        {
            try
            {
                var request = JsonSerializer.Deserialize<MirKvestovOrderRequest>(
                    rawBody,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                if (request != null)
                {
                    return request;
                }
            }
            catch (JsonException)
            {
                // Ignore JSON parse errors and try form-encoded fallback.
            }

            var parsed = QueryHelpers.ParseQuery(rawBody);
            if (parsed.Count > 0)
            {
                return BuildOrderRequest(parsed);
            }
        }

        try
        {
            return await JsonSerializer.DeserializeAsync<MirKvestovOrderRequest>(
                Request.Body,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                },
                HttpContext.RequestAborted);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static MirKvestovOrderRequest BuildOrderRequest(IFormCollection data)
    {
        return BuildOrderRequest(key => data[key]);
    }

    private static MirKvestovOrderRequest BuildOrderRequest(
        IReadOnlyDictionary<string, Microsoft.Extensions.Primitives.StringValues> data)
    {
        return BuildOrderRequest(key => data[key]);
    }

    private static MirKvestovOrderRequest BuildOrderRequest(
        Func<string, Microsoft.Extensions.Primitives.StringValues> getValue)
    {
        return new MirKvestovOrderRequest
        {
            FirstName = getValue("first_name"),
            FamilyName = getValue("family_name"),
            Phone = getValue("phone"),
            Email = getValue("email"),
            Comment = getValue("comment"),
            Source = getValue("source"),
            Md5 = getValue("md5"),
            Date = getValue("date"),
            Time = getValue("time"),
            Price = TryParseInt(getValue("price")),
            UniqueId = getValue("unique_id"),
            YourSlotId = getValue("your_slot_id"),
            Players = TryParseInt(getValue("players")),
            Tariff = getValue("tariff")
        };
    }

    private async Task<string> ReadBodyAsync()
    {
        if (Request.Body == null || !Request.Body.CanRead)
        {
            return string.Empty;
        }

        Request.Body.Position = 0;
        using var reader = new StreamReader(Request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;
        return body;
    }

    private static int? TryParseInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
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
