using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("bookings")]
public class Booking
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

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

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("QuestId")]
    public Quest? Quest { get; set; }

    [ForeignKey("QuestScheduleId")]
    public QuestSchedule? QuestSchedule { get; set; }
}
