namespace QuestRoomApi.DTOs.Schedule;

public class QuestScheduleConsistencyCheckResultDto
{
    public int CheckedSlots { get; set; }
    public int UpdatedSlots { get; set; }
    public int OrphanBookings { get; set; }
    public List<string> Messages { get; set; } = new();
}
