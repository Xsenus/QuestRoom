using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.DurationBadges;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DurationBadgesController : ControllerBase
{
    private readonly IQuestService _questService;

    public DurationBadgesController(IQuestService questService)
    {
        _questService = questService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DurationBadgeDto>>> GetDurationBadges()
    {
        var badges = await _questService.GetDurationBadgesAsync();
        return Ok(badges);
    }
}
