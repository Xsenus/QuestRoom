namespace QuestRoomApi.DTOs.CertificateOrders;

public class CertificateOrderUpdateDto
{
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? Notes { get; set; }
    public string? Status { get; set; }
    public string? DeliveryType { get; set; }
}
