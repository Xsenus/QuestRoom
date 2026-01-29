namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestWeeklySlotUpsertDto
{
    public Guid? Id { get; set; }
    public int DayOfWeek { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public int Price { get; set; }
    public int? HolidayPrice { get; set; }
}
