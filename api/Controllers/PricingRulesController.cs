using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.PricingRules;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PricingRulesController : PermissionAwareControllerBase
{
    private readonly IPricingRuleService _pricingRuleService;

    public PricingRulesController(IPricingRuleService pricingRuleService, AppDbContext context) : base(context)
    {
        _pricingRuleService = pricingRuleService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuestPricingRuleDto>>> GetRules([FromQuery] Guid? questId)
    {
        var rules = await _pricingRuleService.GetRulesAsync(questId);
        return Ok(rules);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<QuestPricingRuleDto>> CreateRule([FromBody] QuestPricingRuleUpsertDto rule)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.pricing.edit"))
        {
            return Forbid();
        }

        var created = await _pricingRuleService.CreateRuleAsync(rule);
        var questId = created.QuestIds.FirstOrDefault();
        return CreatedAtAction(nameof(GetRules), new { questId }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] QuestPricingRuleUpsertDto rule)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.pricing.edit"))
        {
            return Forbid();
        }

        var updated = await _pricingRuleService.UpdateRuleAsync(id, rule);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "calendar.pricing.delete"))
        {
            return Forbid();
        }

        var deleted = await _pricingRuleService.DeleteRuleAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
