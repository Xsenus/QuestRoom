namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleConsistencyCheckResultDto
{
    public DateOnly FromDate { get; set; }
    public DateOnly ToDate { get; set; }
    public DateTime CheckedAtUtc { get; set; }
    public int CheckedSlots { get; set; }
    public int UpdatedSlots { get; set; }
    public int ReleasedSlots { get; set; }
    public int OccupiedSlots { get; set; }
    public int OrphanBookings { get; set; }
    public List<string> Messages { get; set; } = new();
    public List<QuestScheduleConsistencyLogEntryDto> Logs { get; set; } = new();
}
