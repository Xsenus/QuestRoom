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

    [Column("vk_icon_url")]
    public string? VkIconUrl { get; set; }

    [Column("vk_icon_color")]
    public string? VkIconColor { get; set; }

    [Column("vk_icon_background")]
    public string? VkIconBackground { get; set; }

    [Column("youtube_icon_url")]
    public string? YoutubeIconUrl { get; set; }

    [Column("youtube_icon_color")]
    public string? YoutubeIconColor { get; set; }

    [Column("youtube_icon_background")]
    public string? YoutubeIconBackground { get; set; }

    [Column("instagram_icon_url")]
    public string? InstagramIconUrl { get; set; }

    [Column("instagram_icon_color")]
    public string? InstagramIconColor { get; set; }

    [Column("instagram_icon_background")]
    public string? InstagramIconBackground { get; set; }

    [Column("telegram_icon_url")]
    public string? TelegramIconUrl { get; set; }

    [Column("telegram_icon_color")]
    public string? TelegramIconColor { get; set; }

    [Column("telegram_icon_background")]
    public string? TelegramIconBackground { get; set; }

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

    [Column("certificate_email_template_admin")]
    public string? CertificateEmailTemplateAdmin { get; set; }

    [Column("certificate_email_template_customer")]
    public string? CertificateEmailTemplateCustomer { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("logo_url")]
    public string? LogoUrl { get; set; }

    [Column("gift_game_label")]
    public string? GiftGameLabel { get; set; }

    [Column("gift_game_url")]
    public string? GiftGameUrl { get; set; }

    [Column("certificate_page_title")]
    public string? CertificatePageTitle { get; set; }

    [Column("certificate_page_description")]
    public string? CertificatePageDescription { get; set; }

    [Column("certificate_page_pricing")]
    public string? CertificatePagePricing { get; set; }

    [Column("reviews_mode")]
    public string? ReviewsMode { get; set; }

    [Column("reviews_flamp_embed")]
    public string? ReviewsFlampEmbed { get; set; }

    [Column("booking_days_ahead")]
    public int BookingDaysAhead { get; set; }

    [Column("booking_cutoff_minutes")]
    public int BookingCutoffMinutes { get; set; } = 10;

    [Column("booking_status_planned_color")]
    public string? BookingStatusPlannedColor { get; set; }

    [Column("booking_status_created_color")]
    public string? BookingStatusCreatedColor { get; set; }

    [Column("booking_status_pending_color")]
    public string? BookingStatusPendingColor { get; set; }

    [Column("booking_status_not_confirmed_color")]
    public string? BookingStatusNotConfirmedColor { get; set; }

    [Column("booking_status_confirmed_color")]
    public string? BookingStatusConfirmedColor { get; set; }

    [Column("booking_status_completed_color")]
    public string? BookingStatusCompletedColor { get; set; }

    [Column("booking_status_cancelled_color")]
    public string? BookingStatusCancelledColor { get; set; }

    [Column("certificate_status_pending_color")]
    public string? CertificateStatusPendingColor { get; set; }

    [Column("certificate_status_processed_color")]
    public string? CertificateStatusProcessedColor { get; set; }

    [Column("certificate_status_completed_color")]
    public string? CertificateStatusCompletedColor { get; set; }

    [Column("certificate_status_canceled_color")]
    public string? CertificateStatusCanceledColor { get; set; }

    [Column("time_zone")]
    public string? TimeZone { get; set; }

    [Column("promotions_per_row")]
    public int PromotionsPerRow { get; set; } = 1;

    [Column("tea_zones_per_row")]
    public int TeaZonesPerRow { get; set; } = 2;

    [Column("video_modal_enabled")]
    public bool VideoModalEnabled { get; set; }

    [Column("background_gradient_from")]
    public string? BackgroundGradientFrom { get; set; }

    [Column("background_gradient_via")]
    public string? BackgroundGradientVia { get; set; }

    [Column("background_gradient_to")]
    public string? BackgroundGradientTo { get; set; }

    [Column("schedule_background")]
    public string? ScheduleBackground { get; set; }

    [Column("mir_kvestov_md5_key")]
    public string? MirKvestovMd5Key { get; set; }

    [Column("mir_kvestov_prepay_md5_key")]
    public string? MirKvestovPrepayMd5Key { get; set; }

    [Column("mir_kvestov_slot_id_format")]
    public string? MirKvestovSlotIdFormat { get; set; }

    [Column("mir_kvestov_schedule_days_ahead")]
    public int MirKvestovScheduleDaysAhead { get; set; } = 14;

    [Column("mir_kvestov_schedule_fields")]
    public string? MirKvestovScheduleFields { get; set; }

    [Column("mir_kvestov_api_logging_enabled")]
    public bool MirKvestovApiLoggingEnabled { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}
