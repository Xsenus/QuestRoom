namespace QuestRoomApi.DTOs.Quests;

public class QuestExtraServiceDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Price { get; set; }
}
