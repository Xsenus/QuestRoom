namespace QuestRoomApi.DTOs.Content;

public class TeaZoneUpsertDto
{
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}
