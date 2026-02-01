namespace QuestRoomApi.DTOs.Bookings;

public class BookingImportResultDto
{
    public int TotalRows { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public int Duplicates { get; set; }
    public List<string> Errors { get; set; } = new();
}
