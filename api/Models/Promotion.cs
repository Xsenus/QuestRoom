using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("promotions")]
public class Promotion
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("discount_text")]
    public string DiscountText { get; set; } = string.Empty;

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("display_mode")]
    public string DisplayMode { get; set; } = "text_description";

    [Column("show_title")]
    public bool ShowTitle { get; set; }

    [Column("show_description")]
    public bool ShowDescription { get; set; }

    [Column("show_discount_text")]
    public bool ShowDiscountText { get; set; }

    [Column("show_period")]
    public bool ShowPeriod { get; set; }

    [Column("show_image")]
    public bool ShowImage { get; set; } = true;

    [Column("valid_from")]
    public DateOnly ValidFrom { get; set; }

    [Column("valid_until")]
    public DateOnly? ValidUntil { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
