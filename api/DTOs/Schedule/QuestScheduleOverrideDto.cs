namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleOverrideDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public DateOnly Date { get; set; }
    public bool IsClosed { get; set; }
    public List<QuestScheduleOverrideSlotDto> Slots { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
