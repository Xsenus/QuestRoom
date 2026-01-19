using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BookingsController(AppDbContext context)
    {
        _context = context;
    }

    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Booking>>> GetBookings()
    {
        var bookings = await _context.Bookings
            .Include(b => b.Quest)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings);
    }

    [HttpPost]
    public async Task<ActionResult<Booking>> CreateBooking([FromBody] Booking booking)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            booking.Id = Guid.NewGuid();
            booking.CreatedAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            // Update schedule if schedule ID provided
            if (booking.QuestScheduleId.HasValue)
            {
                var schedule = await _context.QuestSchedules.FindAsync(booking.QuestScheduleId.Value);
                if (schedule != null)
                {
                    schedule.IsBooked = true;
                    schedule.BookingId = booking.Id;
                    schedule.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            await transaction.CommitAsync();

            return CreatedAtAction(nameof(GetBookings), new { id = booking.Id }, booking);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBooking(Guid id, [FromBody] Booking booking)
    {
        if (id != booking.Id)
        {
            return BadRequest();
        }

        booking.UpdatedAt = DateTime.UtcNow;
        _context.Entry(booking).State = EntityState.Modified;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBooking(Guid id)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound();
            }

            // Free up schedule slot if exists
            if (booking.QuestScheduleId.HasValue)
            {
                var schedule = await _context.QuestSchedules.FindAsync(booking.QuestScheduleId.Value);
                if (schedule != null)
                {
                    schedule.IsBooked = false;
                    schedule.BookingId = null;
                    schedule.UpdatedAt = DateTime.UtcNow;
                }
            }

            _context.Bookings.Remove(booking);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
