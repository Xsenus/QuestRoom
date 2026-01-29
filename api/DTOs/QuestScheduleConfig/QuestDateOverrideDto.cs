namespace QuestRoomApi.DTOs.QuestScheduleConfig;

public class QuestDateOverrideDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public DateOnly Date { get; set; }
    public bool IsClosed { get; set; }
    public List<QuestDateOverrideSlotDto> Slots { get; set; } = new();
}
