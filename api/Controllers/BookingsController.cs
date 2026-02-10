using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : PermissionAwareControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService, AppDbContext context) : base(context)
    {
        _bookingService = bookingService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings(
        [FromQuery] string? status = null,
        [FromQuery] Guid? questId = null,
        [FromQuery] string? aggregator = null,
        [FromQuery] string? promoCode = null,
        [FromQuery] string? searchQuery = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null,
        [FromQuery] string? sort = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? offset = null)
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
            searchQuery,
            dateFrom,
            dateTo,
            sort,
            limit,
            offset);
        return Ok(bookings);
    }


    [Authorize]
    [HttpGet("count")]
    public async Task<ActionResult<int>> GetBookingsCount(
        [FromQuery] string? status = null,
        [FromQuery] Guid? questId = null,
        [FromQuery] string? aggregator = null,
        [FromQuery] string? promoCode = null,
        [FromQuery] string? searchQuery = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "bookings.view"))
        {
            return Forbid();
        }

        var total = await _bookingService.GetBookingsCountAsync(
            status,
            questId,
            aggregator,
            promoCode,
            searchQuery,
            dateFrom,
            dateTo);
        return Ok(total);
    }

    [Authorize]
    [HttpGet("filters-meta")]
    public async Task<ActionResult<BookingFiltersMetaDto>> GetBookingsFiltersMeta(
        [FromQuery] string? aggregator = null,
        [FromQuery] string? promoCode = null,
        [FromQuery] string? searchQuery = null,
        [FromQuery] DateOnly? dateFrom = null,
        [FromQuery] DateOnly? dateTo = null)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "bookings.view"))
        {
            return Forbid();
        }

        var meta = await _bookingService.GetBookingsFiltersMetaAsync(aggregator, promoCode, searchQuery, dateFrom, dateTo);
        return Ok(meta);
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] BookingCreateDto booking)
    {
        try
        {
            var created = await _bookingService.CreateBookingAsync(booking);
            return CreatedAtAction(nameof(GetBookings), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message,
                code = ResolveCreateBookingErrorCode(ex.Message)
            });
        }
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


    private static string ResolveCreateBookingErrorCode(string? message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return "BOOKING_VALIDATION_FAILED";
        }

        if (message.Contains("Бронирование запрещено", StringComparison.OrdinalIgnoreCase))
        {
            return "BOOKING_BLACKLISTED";
        }

        if (message.Contains("уже забронировано", StringComparison.OrdinalIgnoreCase))
        {
            return "BOOKING_SLOT_ALREADY_BOOKED";
        }

        return "BOOKING_VALIDATION_FAILED";
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
