using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("duration_badges")]
public class DurationBadge
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("duration")]
    public int Duration { get; set; }

    [Column("label")]
    public string Label { get; set; } = string.Empty;

    [Column("badge_image_url")]
    public string? BadgeImageUrl { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
