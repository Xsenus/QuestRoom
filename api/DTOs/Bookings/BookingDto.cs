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
    public string? BookingTime { get; set; }
    public DateTime? BookingDateTime { get; set; }
    public int ParticipantsCount { get; set; }
    public int ExtraParticipantsCount { get; set; }
    public int TotalPrice { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string? PromoCode { get; set; }
    public string? PromoDiscountType { get; set; }
    public int? PromoDiscountValue { get; set; }
    public int? PromoDiscountAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? LegacyId { get; set; }
    public string? Notes { get; set; }
    public string? Aggregator { get; set; }
    public string? AggregatorUniqueId { get; set; }
    public List<BookingExtraServiceDto> ExtraServices { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<BlacklistMatchDto> BlacklistMatches { get; set; } = new();
    public bool IsBlacklisted { get; set; }
}
