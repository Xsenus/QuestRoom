namespace QuestRoomApi.DTOs.Images;

public class ImageAssetDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long SizeBytes { get; set; }
}
