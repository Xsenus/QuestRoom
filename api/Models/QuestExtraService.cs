using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("quest_extra_services")]
public class QuestExtraService
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("quest_id")]
    public Guid QuestId { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("price")]
    public int Price { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    public Quest? Quest { get; set; }
}
