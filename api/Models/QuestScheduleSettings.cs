using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("quest_schedule_settings")]
public class QuestScheduleSettings
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("quest_id")]
    public Guid QuestId { get; set; }

    [Column("holiday_price")]
    public int? HolidayPrice { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Quest? Quest { get; set; }
}
