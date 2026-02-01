using System.ComponentModel.DataAnnotations;

namespace QuestRoomApi.DTOs.Content;

public class TestEmailRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
