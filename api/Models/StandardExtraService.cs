using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("standard_extra_services")]
public class StandardExtraService
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("price")]
    public int Price { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }

    [Column("mandatory_for_child_quests")]
    public bool MandatoryForChildQuests { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
