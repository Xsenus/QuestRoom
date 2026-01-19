namespace QuestRoomApi.DTOs.DurationBadges;

public class DurationBadgeDto
{
    public Guid Id { get; set; }
    public int Duration { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? BadgeImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}
