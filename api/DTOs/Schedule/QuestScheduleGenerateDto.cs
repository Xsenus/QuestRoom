namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleGenerateDto
{
    public Guid? QuestId { get; set; }
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
}
