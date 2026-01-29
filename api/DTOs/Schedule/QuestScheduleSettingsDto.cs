namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleSettingsDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public int? HolidayPrice { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
