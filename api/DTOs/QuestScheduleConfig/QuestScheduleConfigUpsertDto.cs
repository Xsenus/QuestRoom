namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestScheduleConfigUpsertDto
{
    public List<QuestWeeklySlotUpsertDto> WeeklySlots { get; set; } = new();
    public List<QuestDateOverrideUpsertDto> DateOverrides { get; set; } = new();
}
