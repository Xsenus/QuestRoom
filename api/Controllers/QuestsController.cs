using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Quests;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestsController : PermissionAwareControllerBase
{
    private readonly IQuestService _questService;

    public QuestsController(IQuestService questService, AppDbContext context) : base(context)
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

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<QuestDto>> CreateQuest([FromBody] QuestUpsertDto quest)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "quests.edit"))
        {
            return Forbid();
        }

        var created = await _questService.CreateQuestAsync(quest);
        return CreatedAtAction(nameof(GetQuest), new { idOrSlug = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateQuest(Guid id, [FromBody] QuestUpsertDto quest)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "quests.edit"))
        {
            return Forbid();
        }

        var updated = await _questService.UpdateQuestAsync(id, quest);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteQuest(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "quests.delete"))
        {
            return Forbid();
        }

        var result = await _questService.DeleteQuestAsync(id);
        return result switch
        {
            DeleteQuestResult.Deleted => NoContent(),
            DeleteQuestResult.HasBookings => Conflict(new
            {
                message = "Нельзя удалить квест, потому что по нему есть бронирования."
            }),
            DeleteQuestResult.NotFound => NotFound(),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
