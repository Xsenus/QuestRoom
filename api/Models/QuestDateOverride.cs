using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("quest_date_overrides")]
public class QuestDateOverride
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
    public ICollection<QuestDateOverrideSlot> Slots { get; set; } = new List<QuestDateOverrideSlot>();
}
