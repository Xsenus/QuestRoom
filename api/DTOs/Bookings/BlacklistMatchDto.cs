namespace QuestRoomApi.DTOs.Bookings;

public class BlacklistMatchDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public List<string> MatchedPhones { get; set; } = new();
    public List<string> MatchedEmails { get; set; } = new();
}
