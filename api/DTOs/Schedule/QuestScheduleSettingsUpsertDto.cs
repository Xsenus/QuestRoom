namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleSettingsUpsertDto
{
    public Guid QuestId { get; set; }
    public int? HolidayPrice { get; set; }
    public string HolidayPricingMode { get; set; } = "fixed_price";
    public int? HolidayTemplateDayOfWeek { get; set; }
}
