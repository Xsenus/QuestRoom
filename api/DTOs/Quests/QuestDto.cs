namespace QuestRoomApi.DTOs.Quests;

public class QuestDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string[] Addresses { get; set; } = Array.Empty<string>();
    public string[] Phones { get; set; } = Array.Empty<string>();
    public int ParticipantsMin { get; set; }
    public int ParticipantsMax { get; set; }
    public string AgeRestriction { get; set; } = string.Empty;
    public string AgeRating { get; set; } = string.Empty;
    public int Price { get; set; }
    public int Duration { get; set; }
    public bool IsNew { get; set; }
    public bool IsVisible { get; set; }
    public string? MainImage { get; set; }
    public string[] Images { get; set; } = Array.Empty<string>();
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
