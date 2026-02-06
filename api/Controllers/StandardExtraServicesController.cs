using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.StandardExtraServices;
using QuestRoomApi.Models;
using QuestRoomApi.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StandardExtraServicesController : ControllerBase
{
    private readonly IStandardExtraServiceService _service;
    private readonly AppDbContext _context;

    public StandardExtraServicesController(IStandardExtraServiceService service, AppDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StandardExtraServiceDto>>> GetStandardExtraServices(
        [FromQuery] bool? active = null)
    {
        var services = await _service.GetStandardExtraServicesAsync(active);
        return Ok(services);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<StandardExtraServiceDto>> CreateStandardExtraService(
        [FromBody] StandardExtraServiceUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "extra-services.edit"))
        {
            return Forbid();
        }

        var created = await _service.CreateStandardExtraServiceAsync(dto);
        return CreatedAtAction(nameof(GetStandardExtraServices), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateStandardExtraService(Guid id, [FromBody] StandardExtraServiceUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "extra-services.edit"))
        {
            return Forbid();
        }

        var updated = await _service.UpdateStandardExtraServiceAsync(id, dto);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteStandardExtraService(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "extra-services.delete"))
        {
            return Forbid();
        }

        var deleted = await _service.DeleteStandardExtraServiceAsync(id);
        return deleted ? NoContent() : NotFound();
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
