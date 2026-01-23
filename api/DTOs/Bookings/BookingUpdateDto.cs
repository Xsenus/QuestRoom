namespace QuestRoomApi.DTOs.Bookings;

public class BookingUpdateDto
{
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public int? ParticipantsCount { get; set; }
}
