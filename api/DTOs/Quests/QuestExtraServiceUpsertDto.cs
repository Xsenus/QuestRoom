namespace QuestRoomApi.DTOs.Quests;

public class QuestExtraServiceUpsertDto
{
    public Guid? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Price { get; set; }
}
