using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.QuestScheduleConfig;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/questscheduleconfig")]
public class QuestScheduleConfigController : ControllerBase
{
    private readonly IQuestScheduleConfigService _service;

    public QuestScheduleConfigController(IQuestScheduleConfigService service)
    {
        _service = service;
    }

    [Authorize(Roles = "admin")]
    [HttpGet("{questId}")]
    public async Task<ActionResult<QuestScheduleConfigDto>> GetConfig(Guid questId)
    {
        var config = await _service.GetConfigAsync(questId);
        return Ok(config);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{questId}")]
    public async Task<ActionResult<QuestScheduleConfigDto>> UpdateConfig(
        Guid questId,
        [FromBody] QuestScheduleConfigUpsertDto config)
    {
        var updated = await _service.UpdateConfigAsync(questId, config);
        return Ok(updated);
    }
}
