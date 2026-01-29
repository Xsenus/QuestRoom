namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestDateOverrideUpsertDto
{
    public Guid? Id { get; set; }
    public DateOnly Date { get; set; }
    public bool IsClosed { get; set; }
    public List<QuestDateOverrideSlotUpsertDto> Slots { get; set; } = new();
}
