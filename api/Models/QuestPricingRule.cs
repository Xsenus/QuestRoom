using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("quest_pricing_rules")]
public class QuestPricingRule
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("quest_id")]
    public Guid QuestId { get; set; }

    [Column("quest_ids", TypeName = "uuid[]")]
    public Guid[] QuestIds { get; set; } = Array.Empty<Guid>();

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("start_date")]
    public DateOnly? StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("days_of_week", TypeName = "integer[]")]
    public int[] DaysOfWeek { get; set; } = Array.Empty<int>();

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("interval_minutes")]
    public int IntervalMinutes { get; set; }

    [Column("price")]
    public int Price { get; set; }

    [Column("is_blocked")]
    public bool IsBlocked { get; set; }

    [Column("priority")]
    public int Priority { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("QuestId")]
    public Quest? Quest { get; set; }
}
