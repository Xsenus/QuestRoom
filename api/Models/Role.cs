using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("roles")]
public class Role
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("code")]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [Column("name")]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Column("description")]
    [MaxLength(500)]
    public string? Description { get; set; }

    [Column("permissions")]
    public List<string> Permissions { get; set; } = new();

    [Column("is_system")]
    public bool IsSystem { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
