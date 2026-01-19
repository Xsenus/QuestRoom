namespace QuestRoomApi.DTOs.Content;

public class AboutInfoDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Mission { get; set; } = string.Empty;
    public string Vision { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}
