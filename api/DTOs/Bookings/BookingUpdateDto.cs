namespace QuestRoomApi.DTOs.Bookings;

public class BookingUpdateDto
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
