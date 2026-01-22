using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.Quests;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestsController : ControllerBase
{
    private readonly IQuestService _questService;

    public QuestsController(IQuestService questService)
    {
        _questService = questService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<QuestDto>>> GetQuests([FromQuery] bool? visible = null)
    {
        var quests = await _questService.GetQuestsAsync(visible);
        return Ok(quests);
    }

    [HttpGet("{idOrSlug}")]
    public async Task<ActionResult<QuestDto>> GetQuest(string idOrSlug)
    {
        var quest = await _questService.GetQuestAsync(idOrSlug);
        return quest == null ? NotFound() : Ok(quest);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<QuestDto>> CreateQuest([FromBody] QuestUpsertDto quest)
    {
        var created = await _questService.CreateQuestAsync(quest);
        return CreatedAtAction(nameof(GetQuest), new { id = created.Id }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateQuest(Guid id, [FromBody] QuestUpsertDto quest)
    {
        var updated = await _questService.UpdateQuestAsync(id, quest);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteQuest(Guid id)
    {
        var deleted = await _questService.DeleteQuestAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
