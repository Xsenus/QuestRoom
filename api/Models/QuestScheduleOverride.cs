using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace QuestRoomApi.Models;

[Table("quest_schedule_overrides")]
public class QuestScheduleOverride
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("quest_id")]
    public Guid QuestId { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("is_closed")]
    public bool IsClosed { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Quest? Quest { get; set; }

    public ICollection<QuestScheduleOverrideSlot> Slots { get; set; } = new List<QuestScheduleOverrideSlot>();
}
