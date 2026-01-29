namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleOverrideSlotUpsertDto
{
    public TimeOnly TimeSlot { get; set; }
    public int Price { get; set; }
}
