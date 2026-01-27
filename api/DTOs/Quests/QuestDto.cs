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
    public int ExtraParticipantsMax { get; set; }
    public int ExtraParticipantPrice { get; set; }
    public string AgeRestriction { get; set; } = string.Empty;
    public string AgeRating { get; set; } = string.Empty;
    public int Price { get; set; }
    public int Duration { get; set; }
    public int Difficulty { get; set; }
    public int DifficultyMax { get; set; }
    public bool IsNew { get; set; }
    public bool IsVisible { get; set; }
    public string? MainImage { get; set; }
    public string[] Images { get; set; } = Array.Empty<string>();
    public int SortOrder { get; set; }
    public List<QuestExtraServiceDto> ExtraServices { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
