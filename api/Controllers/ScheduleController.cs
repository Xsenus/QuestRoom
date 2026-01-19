using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.Schedule;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScheduleController : ControllerBase
{
    private readonly IScheduleService _scheduleService;

    public ScheduleController(IScheduleService scheduleService)
    {
        _scheduleService = scheduleService;
    }

    [HttpGet("quest/{questId}")]
    public async Task<ActionResult<IEnumerable<QuestScheduleDto>>> GetScheduleForQuest(
        Guid questId,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var schedule = await _scheduleService.GetScheduleForQuestAsync(questId, fromDate, toDate);
        return Ok(schedule);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<QuestScheduleDto>> CreateSlot([FromBody] QuestScheduleUpsertDto slot)
    {
        var created = await _scheduleService.CreateSlotAsync(slot);
        return CreatedAtAction(nameof(GetScheduleForQuest), new { questId = created.QuestId }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSlot(Guid id, [FromBody] QuestScheduleUpsertDto slot)
    {
        var updated = await _scheduleService.UpdateSlotAsync(id, slot);
        return updated ? NoContent() : NotFound();
    }
}
