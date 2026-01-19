using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.Content;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RulesController : ControllerBase
{
    private readonly IContentService _contentService;

    public RulesController(IContentService contentService)
    {
        _contentService = contentService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RuleDto>>> GetRules([FromQuery] bool? visible = null)
    {
        var rules = await _contentService.GetRulesAsync(visible);
        return Ok(rules);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<RuleDto>> CreateRule([FromBody] RuleUpsertDto rule)
    {
        var created = await _contentService.CreateRuleAsync(rule);
        return CreatedAtAction(nameof(GetRules), new { id = created.Id }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] RuleUpsertDto rule)
    {
        var updated = await _contentService.UpdateRuleAsync(id, rule);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        var deleted = await _contentService.DeleteRuleAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
