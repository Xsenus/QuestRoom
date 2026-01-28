using System.ComponentModel.DataAnnotations;

namespace QuestRoomApi.DTOs.AdminUsers;

public class AdminUserPasswordDto
{
    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;
}
