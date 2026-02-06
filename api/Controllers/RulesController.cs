using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Content;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RulesController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;

    public RulesController(IContentService contentService, AppDbContext context) : base(context)
    {
        _contentService = contentService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RuleDto>>> GetRules([FromQuery] bool? visible = null)
    {
        var rules = await _contentService.GetRulesAsync(visible);
        return Ok(rules);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RuleDto>> CreateRule([FromBody] RuleUpsertDto rule)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "rules.edit"))
        {
            return Forbid();
        }

        var created = await _contentService.CreateRuleAsync(rule);
        return CreatedAtAction(nameof(GetRules), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] RuleUpsertDto rule)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "rules.edit"))
        {
            return Forbid();
        }

        var updated = await _contentService.UpdateRuleAsync(id, rule);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "rules.delete"))
        {
            return Forbid();
        }

        var deleted = await _contentService.DeleteRuleAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
