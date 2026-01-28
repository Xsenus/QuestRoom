using System.ComponentModel.DataAnnotations;

namespace QuestRoomApi.DTOs.Roles;

public class RoleUpsertDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [Required]
    public List<string> Permissions { get; set; } = new();
}
