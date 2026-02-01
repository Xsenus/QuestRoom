namespace QuestRoomApi.DTOs.StandardExtraServices;

public class StandardExtraServiceDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Price { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
