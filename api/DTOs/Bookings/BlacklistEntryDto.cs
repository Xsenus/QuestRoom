namespace QuestRoomApi.DTOs.Bookings;

public class BlacklistEntryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<string> Phones { get; set; } = new();
    public List<string> Emails { get; set; } = new();
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
