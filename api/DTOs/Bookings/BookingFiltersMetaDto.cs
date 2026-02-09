namespace QuestRoomApi.DTOs.Bookings;

public class BookingFiltersMetaDto
{
    public Dictionary<string, Dictionary<string, int>> StatusCountsByQuest { get; set; } = new();
    public Dictionary<string, Dictionary<string, int>> QuestCountsByStatus { get; set; } = new();
    public List<string> AggregatorOptions { get; set; } = new();
    public List<string> PromoCodeOptions { get; set; } = new();
}
