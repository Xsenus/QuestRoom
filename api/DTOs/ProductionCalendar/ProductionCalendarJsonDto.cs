namespace QuestRoomApi.DTOs.ProductionCalendar;

public class ProductionCalendarJsonDto
{
    public List<DateOnly>? Holidays { get; set; }
    public List<DateOnly>? Preholidays { get; set; }
    public List<DateOnly>? Nowork { get; set; }

    public bool HasAnyDates =>
        (Holidays?.Count > 0) || (Preholidays?.Count > 0) || (Nowork?.Count > 0);
}
