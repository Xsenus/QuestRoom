namespace QuestRoomApi.DTOs.CertificateOrders;

public class CertificateOrderDto
{
    public Guid Id { get; set; }
    public Guid CertificateId { get; set; }
    public string CertificateTitle { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
