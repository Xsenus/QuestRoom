using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.ProductionCalendar;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductionCalendarController : PermissionAwareControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;

    public ProductionCalendarController(AppDbContext context, IHttpClientFactory httpClientFactory) : base(context)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductionCalendarDayDto>>> GetDays(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        var query = _context.ProductionCalendarDays.AsQueryable();
        if (!string.IsNullOrWhiteSpace(from) && DateOnly.TryParse(from, out var fromDate))
        {
            query = query.Where(day => day.Date >= fromDate);
        }
        if (!string.IsNullOrWhiteSpace(to) && DateOnly.TryParse(to, out var toDate))
        {
            query = query.Where(day => day.Date <= toDate);
        }

        var days = await query
            .OrderBy(day => day.Date)
            .Select(day => ToDto(day))
            .ToListAsync();
        return Ok(days);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ProductionCalendarDayDto>> CreateDay(
        [FromBody] ProductionCalendarDayUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.production.edit"))
        {
            return Forbid();
        }
        var existing = await _context.ProductionCalendarDays
            .FirstOrDefaultAsync(day => day.Date == dto.Date);
        if (existing != null)
        {
            existing.Title = dto.Title;
            existing.DayType = NormalizeDayType(dto.DayType, dto.IsHoliday);
            existing.IsHoliday = ResolveIsHoliday(dto.DayType, dto.IsHoliday);
            existing.Source = dto.Source;
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(ToDto(existing));
        }

        var day = new ProductionCalendarDay
        {
            Id = Guid.NewGuid(),
            Date = dto.Date,
            Title = dto.Title,
            DayType = NormalizeDayType(dto.DayType, dto.IsHoliday),
            IsHoliday = ResolveIsHoliday(dto.DayType, dto.IsHoliday),
            Source = dto.Source,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.ProductionCalendarDays.Add(day);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDays), new { id = day.Id }, ToDto(day));
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDay(Guid id, [FromBody] ProductionCalendarDayUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.production.edit"))
        {
            return Forbid();
        }
        var day = await _context.ProductionCalendarDays.FindAsync(id);
        if (day == null)
        {
            return NotFound();
        }

        day.Date = dto.Date;
        day.Title = dto.Title;
        day.DayType = NormalizeDayType(dto.DayType, dto.IsHoliday);
        day.IsHoliday = ResolveIsHoliday(dto.DayType, dto.IsHoliday);
        day.Source = dto.Source;
        day.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDay(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.production.delete"))
        {
            return Forbid();
        }
        var day = await _context.ProductionCalendarDays.FindAsync(id);
        if (day == null)
        {
            return NotFound();
        }

        _context.ProductionCalendarDays.Remove(day);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ProductionCalendarImportDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.production.edit"))
        {
            return Forbid();
        }
        if (string.IsNullOrWhiteSpace(dto.SourceUrl))
        {
            return BadRequest("Не указан URL.");
        }

        var client = _httpClientFactory.CreateClient();
        var json = await client.GetStringAsync(dto.SourceUrl);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var calendarPayload = TryParseCalendarJson(json, options);
        var data = calendarPayload ?? TryParseDayList(json, options);
        if (data == null)
        {
            return BadRequest("Не удалось получить данные календаря.");
        }

        foreach (var entry in data)
        {
            entry.DayType = NormalizeDayType(entry.DayType, entry.IsHoliday);
            entry.IsHoliday = ResolveIsHoliday(entry.DayType, entry.IsHoliday);
            var existing = await _context.ProductionCalendarDays
                .FirstOrDefaultAsync(day => day.Date == entry.Date);
            if (existing != null)
            {
                existing.Title = entry.Title;
                existing.DayType = entry.DayType;
                existing.IsHoliday = entry.IsHoliday;
                existing.Source = entry.Source ?? dto.SourceUrl;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.ProductionCalendarDays.Add(new ProductionCalendarDay
                {
                    Id = Guid.NewGuid(),
                    Date = entry.Date,
                    Title = entry.Title,
                    DayType = entry.DayType,
                    IsHoliday = entry.IsHoliday,
                    Source = entry.Source ?? dto.SourceUrl,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static ProductionCalendarDayDto ToDto(ProductionCalendarDay day)
    {
        return new ProductionCalendarDayDto
        {
            Id = day.Id,
            Date = day.Date,
            Title = day.Title,
            IsHoliday = day.IsHoliday,
            DayType = day.DayType,
            Source = day.Source,
            CreatedAt = day.CreatedAt,
            UpdatedAt = day.UpdatedAt
        };
    }

    private static string NormalizeDayType(string? dayType, bool isHoliday)
    {
        return dayType switch
        {
            "holidays" => "holidays",
            "preholidays" => "preholidays",
            "nowork" => "nowork",
            _ => isHoliday ? "holidays" : "preholidays"
        };
    }

    private static bool ResolveIsHoliday(string? dayType, bool fallback)
    {
        return dayType switch
        {
            "preholidays" => false,
            "holidays" => true,
            "nowork" => true,
            _ => fallback
        };
    }

    private static List<ProductionCalendarDayUpsertDto>? TryParseCalendarJson(
        string json,
        JsonSerializerOptions options)
    {
        try
        {
            var payload = JsonSerializer.Deserialize<ProductionCalendarJsonDto>(json, options);
            if (payload == null || !payload.HasAnyDates)
            {
                return null;
            }

            var entries = new List<ProductionCalendarDayUpsertDto>();
            if (payload.Holidays != null)
            {
                entries.AddRange(payload.Holidays.Select(date => new ProductionCalendarDayUpsertDto
                {
                    Date = date,
                    IsHoliday = true,
                    DayType = "holidays"
                }));
            }
            if (payload.Preholidays != null)
            {
                entries.AddRange(payload.Preholidays.Select(date => new ProductionCalendarDayUpsertDto
                {
                    Date = date,
                    IsHoliday = false,
                    DayType = "preholidays"
                }));
            }
            if (payload.Nowork != null)
            {
                entries.AddRange(payload.Nowork.Select(date => new ProductionCalendarDayUpsertDto
                {
                    Date = date,
                    IsHoliday = true,
                    DayType = "nowork"
                }));
            }

            return entries;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static List<ProductionCalendarDayUpsertDto>? TryParseDayList(
        string json,
        JsonSerializerOptions options)
    {
        try
        {
            return JsonSerializer.Deserialize<List<ProductionCalendarDayUpsertDto>>(json, options);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
