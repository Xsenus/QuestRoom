using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RulesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RulesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Rule>>> GetRules([FromQuery] bool? visible = null)
    {
        var query = _context.Rules.AsQueryable();

        if (visible.HasValue)
        {
            query = query.Where(r => r.IsVisible == visible.Value);
        }

        var rules = await query.OrderBy(r => r.SortOrder).ToListAsync();
        return Ok(rules);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Rule>> CreateRule([FromBody] Rule rule)
    {
        rule.Id = Guid.NewGuid();
        rule.CreatedAt = DateTime.UtcNow;
        rule.UpdatedAt = DateTime.UtcNow;

        _context.Rules.Add(rule);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRules), new { id = rule.Id }, rule);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] Rule rule)
    {
        if (id != rule.Id) return BadRequest();

        rule.UpdatedAt = DateTime.UtcNow;
        _context.Entry(rule).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        var rule = await _context.Rules.FindAsync(id);
        if (rule == null) return NotFound();

        _context.Rules.Remove(rule);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
