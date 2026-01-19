using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("reviews")]
public class Review
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [Column("quest_title")]
    public string QuestTitle { get; set; } = string.Empty;

    [Column("rating")]
    public int Rating { get; set; }

    [Required]
    [Column("review_text")]
    public string ReviewText { get; set; } = string.Empty;

    [Column("review_date")]
    public DateOnly ReviewDate { get; set; }

    [Column("is_visible")]
    public bool IsVisible { get; set; } = true;

    [Column("is_featured")]
    public bool IsFeatured { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
