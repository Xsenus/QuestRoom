namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestWeeklySlotDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public int DayOfWeek { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public int Price { get; set; }
    public int? HolidayPrice { get; set; }
}
