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

    public MirKvestovController(
        IMirKvestovIntegrationService integrationService,
        AppDbContext context,
        IConfiguration configuration)
    {
        _integrationService = integrationService;
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("{questSlug}")]
    [HttpGet("{questSlug}.json")]
    public async Task<ActionResult<IEnumerable<MirKvestovScheduleSlotDto>>> GetSchedule(
        string questSlug,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        var today = GetLocalToday();
        var fromDate = ParseDateOrDefault(from, today);
        var toDate = ParseDateOrDefault(to, fromDate.AddDays(13));

        var schedule = await _integrationService.GetScheduleAsync(questSlug, fromDate, toDate, HttpContext.RequestAborted);
        return Ok(schedule);
    }

    [HttpPost("{questSlug}/order")]
    public async Task<IActionResult> CreateOrder(string questSlug)
    {
        var request = await ReadOrderRequestAsync();
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
    public async Task<IActionResult> GetTariffs(
        string questSlug,
        [FromQuery] string date,
        [FromQuery] string time)
    {
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
    public async Task<IActionResult> Prepay(
        string questSlug,
        [FromQuery] string md5,
        [FromQuery(Name = "unique_id")] string uniqueId,
        [FromQuery] int prepay)
    {
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

    private DateOnly GetLocalToday()
    {
        var timeZoneId = _configuration["MirKvestov:TimeZone"];
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            timeZoneId = _context.Settings.AsNoTracking().Select(s => s.TimeZone).FirstOrDefault()
                ?? "Asia/Krasnoyarsk";
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
}
