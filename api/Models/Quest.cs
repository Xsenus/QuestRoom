using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("quests")]
public class Quest
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("addresses", TypeName = "text[]")]
    public string[] Addresses { get; set; } = Array.Empty<string>();

    [Column("phones", TypeName = "text[]")]
    public string[] Phones { get; set; } = Array.Empty<string>();

    [Column("participants_min")]
    public int ParticipantsMin { get; set; }

    [Column("participants_max")]
    public int ParticipantsMax { get; set; }

    [Column("age_restriction")]
    public string AgeRestriction { get; set; } = string.Empty;

    [Column("age_rating")]
    public string AgeRating { get; set; } = string.Empty;

    [Column("price")]
    public int Price { get; set; }

    [Column("duration")]
    public int Duration { get; set; }

    [Column("is_new")]
    public bool IsNew { get; set; }

    [Column("is_visible")]
    public bool IsVisible { get; set; } = true;

    [Column("main_image")]
    public string? MainImage { get; set; }

    [Column("images", TypeName = "text[]")]
    public string[] Images { get; set; } = Array.Empty<string>();

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
