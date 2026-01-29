namespace QuestRoomApi.DTOs.Schedule;

public class QuestWeeklySlotDto
{
    public Guid Id { get; set; }
    public Guid QuestId { get; set; }
    public int DayOfWeek { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int Price { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
