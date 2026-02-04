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

    [Column("slug")]
    public string Slug { get; set; } = string.Empty;

    [Column("parent_quest_id")]
    public Guid? ParentQuestId { get; set; }

    [Column("addresses", TypeName = "text[]")]
    public string[] Addresses { get; set; } = Array.Empty<string>();

    [Column("phones", TypeName = "text[]")]
    public string[] Phones { get; set; } = Array.Empty<string>();

    [Column("participants_min")]
    public int ParticipantsMin { get; set; }

    [Column("participants_max")]
    public int ParticipantsMax { get; set; }

    [Column("extra_participants_max")]
    public int ExtraParticipantsMax { get; set; }

    [Column("extra_participant_price")]
    public int ExtraParticipantPrice { get; set; }

    [Column("age_restriction")]
    public string AgeRestriction { get; set; } = string.Empty;

    [Column("age_rating")]
    public string AgeRating { get; set; } = string.Empty;

    [Column("price")]
    public int Price { get; set; }

    [Column("duration")]
    public int Duration { get; set; }

    [Column("difficulty")]
    public int Difficulty { get; set; }

    [Column("difficulty_max")]
    public int DifficultyMax { get; set; }

    [Column("is_new")]
    public bool IsNew { get; set; }

    [Column("is_visible")]
    public bool IsVisible { get; set; } = true;

    [Column("main_image")]
    public string? MainImage { get; set; }

    [Column("images", TypeName = "text[]")]
    public string[] Images { get; set; } = Array.Empty<string>();

    [Column("gift_game_label")]
    public string? GiftGameLabel { get; set; } = "Подарить игру";

    [Column("gift_game_url")]
    public string? GiftGameUrl { get; set; } = "/certificate";

    [Column("video_url")]
    public string? VideoUrl { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Quest? ParentQuest { get; set; }

    public ICollection<Quest> ChildQuests { get; set; } = new List<Quest>();

    public ICollection<QuestExtraService> ExtraServices { get; set; } = new List<QuestExtraService>();
}
