namespace QuestRoomApi.Services;

public static class BookingStatusHelper
{
    public static readonly string[] CancelledStatuses =
    {
        "cancelled",
        "canceled",
        "отменено"
    };

    public static string Normalize(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "pending";
        }

        var normalized = status.Trim().ToLowerInvariant();
        return normalized switch
        {
            "canceled" => "cancelled",
            "отменено" => "cancelled",
            _ => normalized
        };
    }
}
