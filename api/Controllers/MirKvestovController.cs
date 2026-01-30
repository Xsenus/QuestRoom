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
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync();
            return new MirKvestovOrderRequest
            {
                FirstName = form["first_name"],
                FamilyName = form["family_name"],
                Phone = form["phone"],
                Email = form["email"],
                Comment = form["comment"],
                Source = form["source"],
                Md5 = form["md5"],
                Date = form["date"],
                Time = form["time"],
                Price = TryParseInt(form["price"]),
                UniqueId = form["unique_id"],
                YourSlotId = form["your_slot_id"],
                Players = TryParseInt(form["players"]),
                Tariff = form["tariff"]
            };
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

    private static int? TryParseInt(string value)
    {
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
