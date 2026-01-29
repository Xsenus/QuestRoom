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
    [HttpPost("generate")]
    public async Task<ActionResult<object>> GenerateSchedule([FromBody] QuestScheduleGenerateDto request)
    {
        var createdCount = await _scheduleService.GenerateScheduleAsync(
            request.QuestId,
            request.FromDate,
            request.ToDate);

        return Ok(new { createdCount });
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSlot(Guid id, [FromBody] QuestScheduleUpsertDto slot)
    {
        var updated = await _scheduleService.UpdateSlotAsync(id, slot);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpGet("weekly/{questId}")]
    public async Task<ActionResult<IEnumerable<QuestWeeklySlotDto>>> GetWeeklySlots(Guid questId)
    {
        var slots = await _scheduleService.GetWeeklySlotsAsync(questId);
        return Ok(slots);
    }

    [Authorize(Roles = "admin")]
    [HttpPost("weekly")]
    public async Task<ActionResult<QuestWeeklySlotDto>> CreateWeeklySlot([FromBody] QuestWeeklySlotUpsertDto slot)
    {
        var created = await _scheduleService.CreateWeeklySlotAsync(slot);
        return Ok(created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("weekly/{id}")]
    public async Task<IActionResult> UpdateWeeklySlot(Guid id, [FromBody] QuestWeeklySlotUpsertDto slot)
    {
        var updated = await _scheduleService.UpdateWeeklySlotAsync(id, slot);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("weekly/{id}")]
    public async Task<IActionResult> DeleteWeeklySlot(Guid id)
    {
        var deleted = await _scheduleService.DeleteWeeklySlotAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpGet("overrides/{questId}")]
    public async Task<ActionResult<IEnumerable<QuestScheduleOverrideDto>>> GetOverrides(
        Guid questId,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null)
    {
        var overrides = await _scheduleService.GetOverridesAsync(questId, fromDate, toDate);
        return Ok(overrides);
    }

    [Authorize(Roles = "admin")]
    [HttpPost("overrides")]
    public async Task<ActionResult<QuestScheduleOverrideDto>> CreateOverride([FromBody] QuestScheduleOverrideUpsertDto payload)
    {
        var created = await _scheduleService.CreateOverrideAsync(payload);
        return Ok(created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("overrides/{id}")]
    public async Task<IActionResult> UpdateOverride(Guid id, [FromBody] QuestScheduleOverrideUpsertDto payload)
    {
        var updated = await _scheduleService.UpdateOverrideAsync(id, payload);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("overrides/{id}")]
    public async Task<IActionResult> DeleteOverride(Guid id)
    {
        var deleted = await _scheduleService.DeleteOverrideAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpGet("settings/{questId}")]
    public async Task<ActionResult<QuestScheduleSettingsDto>> GetSettings(Guid questId)
    {
        var settings = await _scheduleService.GetSettingsAsync(questId);
        return Ok(settings);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("settings")]
    public async Task<ActionResult<QuestScheduleSettingsDto>> UpdateSettings([FromBody] QuestScheduleSettingsUpsertDto payload)
    {
        var updated = await _scheduleService.UpsertSettingsAsync(payload);
        return Ok(updated);
    }
}
