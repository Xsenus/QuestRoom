namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleOverrideUpsertDto
{
    public Guid QuestId { get; set; }
    public DateOnly Date { get; set; }
    public bool IsClosed { get; set; }
    public List<QuestScheduleOverrideSlotUpsertDto> Slots { get; set; } = new();
}
