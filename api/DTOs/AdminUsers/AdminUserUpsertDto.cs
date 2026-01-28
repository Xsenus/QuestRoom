using System.ComponentModel.DataAnnotations;

namespace QuestRoomApi.DTOs.AdminUsers;

public class AdminUserUpsertDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(40)]
    public string? Phone { get; set; }

    [Required]
    public Guid RoleId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "active";

    public string? Notes { get; set; }

    [MinLength(6)]
    public string? Password { get; set; }
}
