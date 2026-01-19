namespace QuestRoomApi.DTOs.Content;

public class ReviewUpsertDto
{
    public string CustomerName { get; set; } = string.Empty;
    public string QuestTitle { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string ReviewText { get; set; } = string.Empty;
    public DateOnly ReviewDate { get; set; }
    public bool IsVisible { get; set; }
    public bool IsFeatured { get; set; }
}
