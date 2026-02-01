namespace QuestRoomApi.DTOs.Bookings;

public class BookingImportResultDto
{
    public int TotalRows { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public int Duplicates { get; set; }
    public int Processed { get; set; }
    public List<BookingImportIssueDto> SkippedRows { get; set; } = new();
    public List<BookingImportIssueDto> DuplicateRows { get; set; } = new();
}

public class BookingImportIssueDto
{
    public int RowNumber { get; set; }
    public int? LegacyId { get; set; }
    public string Reason { get; set; } = string.Empty;
}
