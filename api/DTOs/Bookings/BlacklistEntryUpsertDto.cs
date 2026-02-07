namespace QuestRoomApi.DTOs.Bookings;

public class BlacklistEntryUpsertDto
{
    public string Name { get; set; } = string.Empty;
    public List<string>? Phones { get; set; }
    public List<string>? Emails { get; set; }
    public string? Comment { get; set; }
}
