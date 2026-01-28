namespace QuestRoomApi.DTOs.ProductionCalendar;

public class ProductionCalendarDayDto
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public string? Title { get; set; }
    public bool IsHoliday { get; set; }
    public string? DayType { get; set; }
    public string? Source { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
