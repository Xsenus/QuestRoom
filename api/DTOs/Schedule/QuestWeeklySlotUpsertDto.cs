namespace QuestRoomApi.DTOs.Schedule;

public class QuestWeeklySlotUpsertDto
{
    public Guid QuestId { get; set; }
    public int DayOfWeek { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int Price { get; set; }
}
