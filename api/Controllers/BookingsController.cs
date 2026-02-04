using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Models;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;
    private readonly AppDbContext _context;

    public BookingsController(IBookingService bookingService, AppDbContext context)
    {
        _bookingService = bookingService;
        _context = context;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings(
        [FromQuery] string? status = null,
        [FromQuery] Guid? questId = null,
        [FromQuery] string? aggregator = null,
        [FromQuery] string? promoCode = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null,
        [FromQuery] string? sort = null)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "bookings.view"))
        {
            return Forbid();
        }
        var bookings = await _bookingService.GetBookingsAsync(
            status,
            questId,
            aggregator,
            promoCode,
            dateFrom,
            dateTo,
            sort);
        return Ok(bookings);
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] BookingCreateDto booking)
    {
        var created = await _bookingService.CreateBookingAsync(booking);
        return CreatedAtAction(nameof(GetBookings), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBooking(Guid id, [FromBody] BookingUpdateDto booking)
    {
        var user = await GetCurrentUserAsync();
        var requiresEdit = HasEditPayload(booking);
        if (requiresEdit && !HasPermission(user, "bookings.edit"))
        {
            return Forbid();
        }
        if (!requiresEdit && !HasPermission(user, "bookings.confirm"))
        {
            return Forbid();
        }
        var updated = await _bookingService.UpdateBookingAsync(id, booking);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBooking(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "bookings.delete"))
        {
            return Forbid();
        }
        var deleted = await _bookingService.DeleteBookingAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpPost("import")]
    public async Task<ActionResult<BookingImportResultDto>> ImportBookings([FromBody] BookingImportRequestDto request)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "bookings.import"))
        {
            return Forbid();
        }
        if (request == null || string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { message = "Контент файла пустой." });
        }

        var result = await _bookingService.ImportBookingsAsync(request.Content);
        return Ok(result);
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

    private static bool HasEditPayload(BookingUpdateDto booking)
    {
        return booking.QuestId != null
            || booking.QuestScheduleId != null
            || booking.Aggregator != null
            || booking.AggregatorUniqueId != null
            || booking.CustomerName != null
            || booking.CustomerPhone != null
            || booking.CustomerEmail != null
            || booking.ParticipantsCount != null
            || booking.ExtraParticipantsCount != null
            || booking.BookingDate != null
            || booking.TotalPrice != null
            || booking.PaymentType != null
            || booking.PromoCode != null
            || booking.PromoDiscountType != null
            || booking.PromoDiscountValue != null
            || booking.PromoDiscountAmount != null
            || booking.ExtraServices != null;
    }
}
