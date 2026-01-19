using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.PricingRules;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PricingRulesController : ControllerBase
{
    private readonly IPricingRuleService _pricingRuleService;

    public PricingRulesController(IPricingRuleService pricingRuleService)
    {
        _pricingRuleService = pricingRuleService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuestPricingRuleDto>>> GetRules([FromQuery] Guid? questId)
    {
        var rules = await _pricingRuleService.GetRulesAsync(questId);
        return Ok(rules);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<QuestPricingRuleDto>> CreateRule([FromBody] QuestPricingRuleUpsertDto rule)
    {
        var created = await _pricingRuleService.CreateRuleAsync(rule);
        return CreatedAtAction(nameof(GetRules), new { questId = created.QuestId }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRule(Guid id, [FromBody] QuestPricingRuleUpsertDto rule)
    {
        var updated = await _pricingRuleService.UpdateRuleAsync(id, rule);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRule(Guid id)
    {
        var deleted = await _pricingRuleService.DeleteRuleAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
