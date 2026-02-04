using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Users;
using QuestRoomApi.Models;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/user-preferences")]
public class UserPreferencesController : ControllerBase
{
    private readonly IUserPreferencesService _preferencesService;
    private readonly AppDbContext _context;

    public UserPreferencesController(IUserPreferencesService preferencesService, AppDbContext context)
    {
        _preferencesService = preferencesService;
        _context = context;
    }

[Authorize]
[HttpGet("bookings-table")]
public async Task<ActionResult<BookingTablePreferencesDto>> GetBookingsTable()
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }
        var user = await GetCurrentUserAsync(userId.Value);
        if (!HasPermission(user, "bookings.view"))
        {
            return Forbid();
        }

        var preferences = await _preferencesService.GetBookingTableAsync(userId.Value);
        return Ok(preferences ?? new BookingTablePreferencesDto());
    }

[Authorize]
[HttpPut("bookings-table")]
public async Task<IActionResult> UpdateBookingsTable([FromBody] BookingTablePreferencesDto preferences)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }
        var user = await GetCurrentUserAsync(userId.Value);
        if (!HasPermission(user, "bookings.view"))
        {
            return Forbid();
        }

        await _preferencesService.SaveBookingTableAsync(userId.Value, preferences);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var rawUserId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(rawUserId, out var userId) ? userId : null;
    }

    private async Task<User?> GetCurrentUserAsync(Guid userId)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static bool HasPermission(User? user, string permission)
    {
        return user?.Role?.Permissions?.Contains(permission) == true;
    }
}
