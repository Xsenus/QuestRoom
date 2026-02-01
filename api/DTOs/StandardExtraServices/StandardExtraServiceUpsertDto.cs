namespace QuestRoomApi.DTOs.StandardExtraServices;

public class StandardExtraServiceUpsertDto
{
    public string Title { get; set; } = string.Empty;
    public int Price { get; set; }
    public bool IsActive { get; set; }
}
