namespace QuestRoomApi.DTOs.PromoCodes;

public class PromoCodeUpsertDto
{
    public string Code { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string DiscountType { get; set; } = "percent";
    public int DiscountValue { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly? ValidUntil { get; set; }
    public bool IsActive { get; set; }
}
