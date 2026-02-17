namespace QuestRoomApi.DTOs.Content;

public class MetricSnippetDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
}
