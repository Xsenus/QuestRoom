using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("quest_date_override_slots")]
public class QuestDateOverrideSlot
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("override_id")]
    public Guid OverrideId { get; set; }

    [Column("time_slot")]
    public TimeOnly TimeSlot { get; set; }

    [Column("price")]
    public int Price { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public QuestDateOverride? Override { get; set; }
}
