namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleOverrideSlotDto
{
    public Guid Id { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int Price { get; set; }
}
