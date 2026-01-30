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
}
