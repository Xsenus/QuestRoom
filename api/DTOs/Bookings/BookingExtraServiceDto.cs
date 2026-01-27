namespace QuestRoomApi.DTOs.Bookings;

public class BookingExtraServiceDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Price { get; set; }
}
