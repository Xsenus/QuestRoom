namespace QuestRoomApi.DTOs.Users;

public class BookingTableColumnPreferenceDto
{
    public string Key { get; set; } = string.Empty;
    public int Width { get; set; }
    public bool Visible { get; set; }
}

public class BookingTablePreferencesDto
{
    public List<BookingTableColumnPreferenceDto> Columns { get; set; } = new();
    public string? SearchQuery { get; set; }
    public List<BookingTableFilterDto> ColumnFilters { get; set; } = new();
}

public class BookingTableFilterDto
{
    public string Id { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string? Value { get; set; }
    public List<string> Values { get; set; } = new();
}
