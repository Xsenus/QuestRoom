namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleUpsertDto
{
    public Guid QuestId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int Price { get; set; }
    public bool IsBooked { get; set; }
    public Guid? BookingId { get; set; }
}
