using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.DTOs.Quests;
using QuestRoomApi.Data;
using QuestRoomApi.Models;
using QuestRoomApi.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuestsController : ControllerBase
{
    private readonly IQuestService _questService;
    private readonly AppDbContext _context;

    public QuestsController(IQuestService questService, AppDbContext context)
    {
        _questService = questService;
        _context = context;
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

    private async Task<User?> GetCurrentUserAsync()
    {
        var rawUserId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(rawUserId) || !Guid.TryParse(rawUserId, out var userId))
        {
            return null;
        }

        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static bool HasPermission(User? user, string permission)
    {
        return user?.Role?.Permissions?.Contains(permission) == true;
    }
}
