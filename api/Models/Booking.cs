using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("bookings")]
public class Booking
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("legacy_id")]
    public int LegacyId { get; set; }

    [Column("quest_id")]
    public Guid? QuestId { get; set; }

    [Column("quest_schedule_id")]
    public Guid? QuestScheduleId { get; set; }

    [Required]
    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [Column("customer_phone")]
    public string CustomerPhone { get; set; } = string.Empty;

    [Column("customer_email")]
    public string? CustomerEmail { get; set; }

    [Column("booking_date")]
    public DateOnly BookingDate { get; set; }

    [Column("participants_count")]
    public int ParticipantsCount { get; set; }

    [Column("extra_participants_count")]
    public int ExtraParticipantsCount { get; set; }

    [Column("total_price")]
    public int TotalPrice { get; set; }

    [Column("payment_type")]
    public string PaymentType { get; set; } = "cash";

    [Column("promo_code_id")]
    public Guid? PromoCodeId { get; set; }

    [Column("promo_code")]
    public string? PromoCode { get; set; }

    [Column("promo_discount_type")]
    public string? PromoDiscountType { get; set; }

    [Column("promo_discount_value")]
    public int? PromoDiscountValue { get; set; }

    [Column("promo_discount_amount")]
    public int? PromoDiscountAmount { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("aggregator")]
    public string? Aggregator { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Quest? Quest { get; set; }

    public QuestSchedule? QuestSchedule { get; set; }

    public ICollection<BookingExtraService> ExtraServices { get; set; } = new List<BookingExtraService>();
}
