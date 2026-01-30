using System.Text.Json.Serialization;

namespace QuestRoomApi.DTOs.MirKvestov;

public class MirKvestovScheduleSlotDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("time")]
    public string Time { get; set; } = string.Empty;

    [JsonPropertyName("is_free")]
    public bool IsFree { get; set; }

    [JsonPropertyName("price")]
    public int Price { get; set; }

    [JsonPropertyName("discount_price")]
    public int? DiscountPrice { get; set; }

    [JsonPropertyName("your_slot_id")]
    public string? YourSlotId { get; set; }
}
