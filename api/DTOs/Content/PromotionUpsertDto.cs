namespace QuestRoomApi.DTOs.Content;

public class PromotionUpsertDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DiscountText { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string DisplayMode { get; set; } = "text_description";
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidUntil { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}
