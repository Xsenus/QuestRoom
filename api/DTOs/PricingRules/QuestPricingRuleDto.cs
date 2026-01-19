namespace QuestRoomApi.DTOs.PricingRules;

public class QuestPricingRuleDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int[] DaysOfWeek { get; set; } = Array.Empty<int>();
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int IntervalMinutes { get; set; }
    public int Price { get; set; }
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
