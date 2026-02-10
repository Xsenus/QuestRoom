namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleConsistencyLogEntryDto
{
    public Guid? QuestId { get; set; }
    public string QuestTitle { get; set; } = string.Empty;
    public DateOnly? Date { get; set; }
    public TimeOnly? TimeSlot { get; set; }
    public bool? PreviousIsBooked { get; set; }
    public bool? CurrentIsBooked { get; set; }
    public string Issue { get; set; } = string.Empty;
    public string Resolution { get; set; } = string.Empty;
    public string Source { get; set; } = "consistency-check";
}
