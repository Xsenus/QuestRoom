namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestDateOverrideSlotDto
{
    public Guid Id { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public int Price { get; set; }
}
