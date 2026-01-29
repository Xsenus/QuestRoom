namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleSettingsUpsertDto
{
    public Guid QuestId { get; set; }
    public int? HolidayPrice { get; set; }
}
