namespace QuestRoomApi.DTOs.Content;

public class SettingsDto
{
    public Guid Id { get; set; }
    public string? VkUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? TelegramUrl { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? NotificationEmail { get; set; }
    public string? SmtpHost { get; set; }
    public int? SmtpPort { get; set; }
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
    public bool SmtpUseSsl { get; set; }
    public string? SmtpFromEmail { get; set; }
    public string? SmtpFromName { get; set; }
    public bool NotifyBookingAdmin { get; set; }
    public bool NotifyBookingCustomer { get; set; }
    public string? BookingEmailTemplateAdmin { get; set; }
    public string? BookingEmailTemplateCustomer { get; set; }
    public bool NotifyCertificateAdmin { get; set; }
    public bool NotifyCertificateCustomer { get; set; }
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }
    public DateTime UpdatedAt { get; set; }
}
