namespace QuestRoomApi.DTOs.ProductionCalendar;

public class ProductionCalendarDayUpsertDto
{
    public DateOnly Date { get; set; }
    public string? Title { get; set; }
    public bool IsHoliday { get; set; }
    public string? Source { get; set; }
}
