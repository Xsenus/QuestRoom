using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.Users;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/user-preferences")]
public class UserPreferencesController : ControllerBase
{
    private readonly IUserPreferencesService _preferencesService;

    public UserPreferencesController(IUserPreferencesService preferencesService)
    {
        _preferencesService = preferencesService;
    }

[Authorize(Roles = "admin")]
[HttpGet("bookings-table")]
public async Task<ActionResult<BookingTablePreferencesDto>> GetBookingsTable()
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var preferences = await _preferencesService.GetBookingTableAsync(userId.Value);
        return Ok(preferences ?? new BookingTablePreferencesDto());
    }

[Authorize(Roles = "admin")]
[HttpPut("bookings-table")]
public async Task<IActionResult> UpdateBookingsTable([FromBody] BookingTablePreferencesDto preferences)
    {
        var userId = GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        await _preferencesService.SaveBookingTableAsync(userId.Value, preferences);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var rawUserId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(rawUserId, out var userId) ? userId : null;
    }
}
