using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("user_preferences")]
public class UserPreference
{
    [Key]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("booking_table_preferences", TypeName = "jsonb")]
    public string? BookingTablePreferencesJson { get; set; }

    public User? User { get; set; }
}
