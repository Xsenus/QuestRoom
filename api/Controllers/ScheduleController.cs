using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly AppDbContext _context;

    public ScheduleController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("quest/{questId}")]
    public async Task<ActionResult<IEnumerable<QuestSchedule>>> GetScheduleForQuest(
        Guid questId,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var query = _context.QuestSchedules
            .Where(s => s.QuestId == questId);

        if (fromDate.HasValue)
        {
            query = query.Where(s => s.Date >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(s => s.Date <= toDate.Value);
        }

        var schedule = await query
            .OrderBy(s => s.Date)
            .ThenBy(s => s.TimeSlot)
            .ToListAsync();

        return Ok(schedule);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<QuestSchedule>> CreateSlot([FromBody] QuestSchedule slot)
    {
        slot.Id = Guid.NewGuid();
        slot.CreatedAt = DateTime.UtcNow;
        slot.UpdatedAt = DateTime.UtcNow;

        _context.QuestSchedules.Add(slot);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetScheduleForQuest), new { questId = slot.QuestId }, slot);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSlot(Guid id, [FromBody] QuestSchedule slot)
    {
        if (id != slot.Id)
        {
            return BadRequest();
        }

        slot.UpdatedAt = DateTime.UtcNow;
        _context.Entry(slot).State = EntityState.Modified;

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
