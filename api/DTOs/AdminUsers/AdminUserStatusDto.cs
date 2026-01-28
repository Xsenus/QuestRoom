using System.ComponentModel.DataAnnotations;

namespace QuestRoomApi.DTOs.AdminUsers;

public class AdminUserStatusDto
{
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "active";
}
