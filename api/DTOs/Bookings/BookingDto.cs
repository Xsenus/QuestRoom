namespace QuestRoomApi.DTOs.Bookings;

public class BookingDto
{
    public Guid Id { get; set; }
    public Guid? QuestId { get; set; }
    public Guid? QuestScheduleId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public DateOnly BookingDate { get; set; }
    public int ParticipantsCount { get; set; }
    public int ExtraParticipantsCount { get; set; }
    public int TotalPrice { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public List<BookingExtraServiceDto> ExtraServices { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
