namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int Price { get; set; }
    public bool IsBooked { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
