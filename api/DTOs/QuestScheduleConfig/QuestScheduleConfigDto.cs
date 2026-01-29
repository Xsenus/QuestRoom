namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestScheduleConfigDto
{
    public Guid QuestId { get; set; }
    public List<QuestWeeklySlotDto> WeeklySlots { get; set; } = new();
    public List<QuestDateOverrideDto> DateOverrides { get; set; } = new();
}
