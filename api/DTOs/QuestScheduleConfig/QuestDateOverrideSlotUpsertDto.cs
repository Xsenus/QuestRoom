namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestDateOverrideSlotUpsertDto
{
    public Guid? Id { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public int Price { get; set; }
}
