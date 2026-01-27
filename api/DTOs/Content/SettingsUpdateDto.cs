namespace QuestRoomApi.DTOs.Content;

public class SettingsUpdateDto
{
    public string? VkUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? TelegramUrl { get; set; }
    public string? VkIconUrl { get; set; }
    public string? VkIconColor { get; set; }
    public string? VkIconBackground { get; set; }
    public string? YoutubeIconUrl { get; set; }
    public string? YoutubeIconColor { get; set; }
    public string? YoutubeIconBackground { get; set; }
    public string? InstagramIconUrl { get; set; }
    public string? InstagramIconColor { get; set; }
    public string? InstagramIconBackground { get; set; }
    public string? TelegramIconUrl { get; set; }
    public string? TelegramIconColor { get; set; }
    public string? TelegramIconBackground { get; set; }
    public string? Address { get; set; }
    public string? Email { get; set; }
    public string? NotificationEmail { get; set; }
    public string? SmtpHost { get; set; }
    public int? SmtpPort { get; set; }
    public string? SmtpUser { get; set; }
    public string? SmtpPassword { get; set; }
    public bool? SmtpUseSsl { get; set; }
    public string? SmtpFromEmail { get; set; }
    public string? SmtpFromName { get; set; }
    public bool? NotifyBookingAdmin { get; set; }
    public bool? NotifyBookingCustomer { get; set; }
    public string? BookingEmailTemplateAdmin { get; set; }
    public string? BookingEmailTemplateCustomer { get; set; }
    public bool? NotifyCertificateAdmin { get; set; }
    public bool? NotifyCertificateCustomer { get; set; }
    public string? Phone { get; set; }
    public string? LogoUrl { get; set; }
    public string? GiftGameLabel { get; set; }
    public string? GiftGameUrl { get; set; }
    public string? CertificatePageTitle { get; set; }
    public string? CertificatePageDescription { get; set; }
    public string? CertificatePagePricing { get; set; }
    public string? ReviewsMode { get; set; }
    public string? ReviewsFlampEmbed { get; set; }
    public int BookingDaysAhead { get; set; }
}
