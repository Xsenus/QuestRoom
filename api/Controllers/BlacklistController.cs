using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BlacklistController : PermissionAwareControllerBase
{
    private readonly IBlacklistService _blacklistService;

    public BlacklistController(IBlacklistService blacklistService, AppDbContext context) : base(context)
    {
        _blacklistService = blacklistService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BlacklistEntryDto>>> GetEntries()
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "blacklist.view"))
        {
            return Forbid();
        }

        return Ok(await _blacklistService.GetEntriesAsync());
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<BlacklistEntryDto>> CreateEntry([FromBody] BlacklistEntryUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "blacklist.edit"))
        {
            return Forbid();
        }

        try
        {
            var created = await _blacklistService.CreateEntryAsync(dto);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEntry(Guid id, [FromBody] BlacklistEntryUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "blacklist.edit"))
        {
            return Forbid();
        }

        try
        {
            var updated = await _blacklistService.UpdateEntryAsync(id, dto);
            return updated ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEntry(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "blacklist.delete"))
        {
            return Forbid();
        }

        var deleted = await _blacklistService.DeleteEntryAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPost("check")]
    public async Task<ActionResult<IEnumerable<BlacklistMatchDto>>> Check([FromBody] BlacklistCheckRequestDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "bookings.view"))
        {
            return Forbid();
        }

        return Ok(await _blacklistService.FindMatchesAsync(dto.Phone, dto.Email));
    }
}
