using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("settings")]
public class Settings
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("vk_url")]
    public string? VkUrl { get; set; }

    [Column("youtube_url")]
    public string? YoutubeUrl { get; set; }

    [Column("instagram_url")]
    public string? InstagramUrl { get; set; }

    [Column("telegram_url")]
    public string? TelegramUrl { get; set; }

    [Column("address")]
    public string? Address { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
