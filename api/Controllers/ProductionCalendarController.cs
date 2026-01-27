using System.Net.Http.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.ProductionCalendar;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductionCalendarController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;

    public ProductionCalendarController(AppDbContext context, IHttpClientFactory httpClientFactory)
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

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<ProductionCalendarDayDto>> CreateDay(
        [FromBody] ProductionCalendarDayUpsertDto dto)
    {
        var existing = await _context.ProductionCalendarDays
            .FirstOrDefaultAsync(day => day.Date == dto.Date);
        if (existing != null)
        {
            existing.Title = dto.Title;
            existing.IsHoliday = dto.IsHoliday;
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
            IsHoliday = dto.IsHoliday,
            Source = dto.Source,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.ProductionCalendarDays.Add(day);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDays), new { id = day.Id }, ToDto(day));
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDay(Guid id, [FromBody] ProductionCalendarDayUpsertDto dto)
    {
        var day = await _context.ProductionCalendarDays.FindAsync(id);
        if (day == null)
        {
            return NotFound();
        }

        day.Date = dto.Date;
        day.Title = dto.Title;
        day.IsHoliday = dto.IsHoliday;
        day.Source = dto.Source;
        day.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDay(Guid id)
    {
        var day = await _context.ProductionCalendarDays.FindAsync(id);
        if (day == null)
        {
            return NotFound();
        }

        _context.ProductionCalendarDays.Remove(day);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ProductionCalendarImportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SourceUrl))
        {
            return BadRequest("Не указан URL.");
        }

        var client = _httpClientFactory.CreateClient();
        var data = await client.GetFromJsonAsync<List<ProductionCalendarDayUpsertDto>>(dto.SourceUrl);
        if (data == null)
        {
            return BadRequest("Не удалось получить данные календаря.");
        }

        foreach (var entry in data)
        {
            var existing = await _context.ProductionCalendarDays
                .FirstOrDefaultAsync(day => day.Date == entry.Date);
            if (existing != null)
            {
                existing.Title = entry.Title;
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
            Source = day.Source,
            CreatedAt = day.CreatedAt,
            UpdatedAt = day.UpdatedAt
        };
    }
}
