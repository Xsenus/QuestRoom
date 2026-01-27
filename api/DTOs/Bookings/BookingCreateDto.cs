namespace QuestRoomApi.DTOs.Bookings;

public class BookingCreateDto
{
    public Guid? QuestId { get; set; }
    public Guid? QuestScheduleId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public DateOnly BookingDate { get; set; }
    public int ParticipantsCount { get; set; }
    public string? Notes { get; set; }
    public Guid[] ExtraServiceIds { get; set; } = Array.Empty<Guid>();
    public string? PaymentType { get; set; }
    public string? PromoCode { get; set; }
}
