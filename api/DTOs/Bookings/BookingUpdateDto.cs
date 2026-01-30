namespace QuestRoomApi.DTOs.Bookings;

public class BookingUpdateDto
{
    public Guid? QuestId { get; set; }
    public Guid? QuestScheduleId { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public string? Aggregator { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public int? ParticipantsCount { get; set; }
    public int? ExtraParticipantsCount { get; set; }
    public DateTime? BookingDate { get; set; }
    public int? TotalPrice { get; set; }
    public string? PaymentType { get; set; }
    public string? PromoCode { get; set; }
    public string? PromoDiscountType { get; set; }
    public int? PromoDiscountValue { get; set; }
    public int? PromoDiscountAmount { get; set; }
    public List<BookingExtraServiceDto>? ExtraServices { get; set; }
}
