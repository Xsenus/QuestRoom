using QuestRoomApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("quest_schedule")]
public class QuestSchedule
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("quest_id")]
    public Guid QuestId { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("time_slot")]
    public TimeOnly TimeSlot { get; set; }

    [Column("price")]
    public int Price { get; set; }

    [Column("is_booked")]
    public bool IsBooked { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Quest? Quest { get; set; }

    public Booking? Booking { get; set; }
}
