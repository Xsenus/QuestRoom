using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("booking_extra_services")]
public class BookingExtraService
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("booking_id")]
    public Guid BookingId { get; set; }

    [Column("quest_extra_service_id")]
    public Guid? QuestExtraServiceId { get; set; }

    [Required]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Column("price")]
    public int Price { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    public Booking? Booking { get; set; }
}
