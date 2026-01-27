using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("production_calendar_days")]
public class ProductionCalendarDay
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("date")]
    public DateOnly Date { get; set; }

    [Column("title")]
    public string? Title { get; set; }

    [Column("is_holiday")]
    public bool IsHoliday { get; set; }

    [Column("source")]
    public string? Source { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
