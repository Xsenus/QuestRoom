namespace QuestRoomApi.DTOs.Content;

public class CertificateUpsertDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateOnly IssuedDate { get; set; }
    public int SortOrder { get; set; }
    public bool IsVisible { get; set; }
}
