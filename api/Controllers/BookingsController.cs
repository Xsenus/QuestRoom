using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings()
    {
        var bookings = await _bookingService.GetBookingsAsync();
        return Ok(bookings);
    }

    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking([FromBody] BookingCreateDto booking)
    {
        var created = await _bookingService.CreateBookingAsync(booking);
        return CreatedAtAction(nameof(GetBookings), new { id = created.Id }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBooking(Guid id, [FromBody] BookingUpdateDto booking)
    {
        var updated = await _bookingService.UpdateBookingAsync(id, booking);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBooking(Guid id)
    {
        var deleted = await _bookingService.DeleteBookingAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpPost("import")]
    public async Task<ActionResult<BookingImportResultDto>> ImportBookings([FromBody] BookingImportRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { message = "Контент файла пустой." });
        }

        var result = await _bookingService.ImportBookingsAsync(request.Content);
        return Ok(result);
    }
}
