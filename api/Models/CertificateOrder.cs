using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("certificate_orders")]
public class CertificateOrder
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("certificate_id")]
    public Guid CertificateId { get; set; }

    [Required]
    [Column("certificate_title")]
    public string CertificateTitle { get; set; } = string.Empty;

    [Required]
    [Column("customer_name")]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [Column("customer_phone")]
    public string CustomerPhone { get; set; } = string.Empty;

    [Column("customer_email")]
    public string? CustomerEmail { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("delivery_type")]
    public string? DeliveryType { get; set; }

    [Column("status")]
    public string Status { get; set; } = "pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
