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

    [Column("notification_email")]
    public string? NotificationEmail { get; set; }

    [Column("smtp_host")]
    public string? SmtpHost { get; set; }

    [Column("smtp_port")]
    public int? SmtpPort { get; set; }

    [Column("smtp_user")]
    public string? SmtpUser { get; set; }

    [Column("smtp_password")]
    public string? SmtpPassword { get; set; }

    [Column("smtp_use_ssl")]
    public bool SmtpUseSsl { get; set; }

    [Column("smtp_from_email")]
    public string? SmtpFromEmail { get; set; }

    [Column("smtp_from_name")]
    public string? SmtpFromName { get; set; }

    [Column("notify_booking_admin")]
    public bool NotifyBookingAdmin { get; set; }

    [Column("notify_booking_customer")]
    public bool NotifyBookingCustomer { get; set; }

    [Column("booking_email_template_admin")]
    public string? BookingEmailTemplateAdmin { get; set; }

    [Column("booking_email_template_customer")]
    public string? BookingEmailTemplateCustomer { get; set; }

    [Column("notify_certificate_admin")]
    public bool NotifyCertificateAdmin { get; set; }

    [Column("notify_certificate_customer")]
    public bool NotifyCertificateCustomer { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
