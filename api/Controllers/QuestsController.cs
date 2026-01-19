using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestsController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuestsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Quest>>> GetQuests([FromQuery] bool? visible = true)
    {
        var query = _context.Quests.AsQueryable();

        if (visible.HasValue)
        {
            query = query.Where(q => q.IsVisible == visible.Value);
        }

        var quests = await query
            .OrderBy(q => q.SortOrder)
            .ToListAsync();

        return Ok(quests);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Quest>> GetQuest(Guid id)
    {
        var quest = await _context.Quests.FindAsync(id);

        if (quest == null)
        {
            return NotFound();
        }

        return Ok(quest);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Quest>> CreateQuest([FromBody] Quest quest)
    {
        quest.Id = Guid.NewGuid();
        quest.CreatedAt = DateTime.UtcNow;
        quest.UpdatedAt = DateTime.UtcNow;

        _context.Quests.Add(quest);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuest), new { id = quest.Id }, quest);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateQuest(Guid id, [FromBody] Quest quest)
    {
        if (id != quest.Id)
        {
            return BadRequest();
        }

        quest.UpdatedAt = DateTime.UtcNow;
        _context.Entry(quest).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await QuestExists(id))
            {
                return NotFound();
            }
            throw;
        }

        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteQuest(Guid id)
    {
        var quest = await _context.Quests.FindAsync(id);
        if (quest == null)
        {
            return NotFound();
        }

        _context.Quests.Remove(quest);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> QuestExists(Guid id)
    {
        return await _context.Quests.AnyAsync(e => e.Id == id);
    }
}
