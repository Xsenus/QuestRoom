using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("promo_codes")]
public class PromoCode
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("code")]
    public string Code { get; set; } = string.Empty;

    [Column("name")]
    public string? Name { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("discount_type")]
    public string DiscountType { get; set; } = "percent";

    [Column("discount_value")]
    public int DiscountValue { get; set; }

    [Column("valid_from")]
    public DateOnly ValidFrom { get; set; }

    [Column("valid_until")]
    public DateOnly? ValidUntil { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
