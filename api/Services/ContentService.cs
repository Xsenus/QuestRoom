using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Content;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IContentService
{
    Task<IReadOnlyList<RuleDto>> GetRulesAsync(bool? visible);
    Task<RuleDto> CreateRuleAsync(RuleUpsertDto dto);
    Task<bool> UpdateRuleAsync(Guid id, RuleUpsertDto dto);
    Task<bool> DeleteRuleAsync(Guid id);

    Task<IReadOnlyList<ReviewDto>> GetReviewsAsync(bool? visible);
    Task<ReviewDto> CreateReviewAsync(ReviewUpsertDto dto);
    Task<bool> UpdateReviewAsync(Guid id, ReviewUpsertDto dto);
    Task<bool> DeleteReviewAsync(Guid id);

    Task<IReadOnlyList<PromotionDto>> GetPromotionsAsync(bool? active);
    Task<PromotionDto> CreatePromotionAsync(PromotionUpsertDto dto);
    Task<bool> UpdatePromotionAsync(Guid id, PromotionUpsertDto dto);
    Task<bool> DeletePromotionAsync(Guid id);

    Task<IReadOnlyList<CertificateDto>> GetCertificatesAsync(bool? visible);
    Task<CertificateDto> CreateCertificateAsync(CertificateUpsertDto dto);
    Task<bool> UpdateCertificateAsync(Guid id, CertificateUpsertDto dto);
    Task<bool> DeleteCertificateAsync(Guid id);

    Task<AboutInfoDto?> GetAboutInfoAsync();
    Task UpdateAboutInfoAsync(AboutInfoUpdateDto dto);

    Task<SettingsDto?> GetSettingsAsync();
    Task UpdateSettingsAsync(SettingsUpdateDto dto);
}

public class ContentService : IContentService
{
    private readonly AppDbContext _context;

    public ContentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<RuleDto>> GetRulesAsync(bool? visible)
    {
        var query = _context.Rules.AsQueryable();
        if (visible.HasValue)
        {
            query = query.Where(r => r.IsVisible == visible.Value);
        }

        return await query
            .OrderBy(r => r.SortOrder)
            .Select(r => ToDto(r))
            .ToListAsync();
    }

    public async Task<RuleDto> CreateRuleAsync(RuleUpsertDto dto)
    {
        var rule = new Rule
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Content = dto.Content,
            SortOrder = dto.SortOrder,
            IsVisible = dto.IsVisible,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Rules.Add(rule);
        await _context.SaveChangesAsync();
        return ToDto(rule);
    }

    public async Task<bool> UpdateRuleAsync(Guid id, RuleUpsertDto dto)
    {
        var rule = await _context.Rules.FindAsync(id);
        if (rule == null)
        {
            return false;
        }

        rule.Title = dto.Title;
        rule.Content = dto.Content;
        rule.SortOrder = dto.SortOrder;
        rule.IsVisible = dto.IsVisible;
        rule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteRuleAsync(Guid id)
    {
        var rule = await _context.Rules.FindAsync(id);
        if (rule == null)
        {
            return false;
        }

        _context.Rules.Remove(rule);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<ReviewDto>> GetReviewsAsync(bool? visible)
    {
        var query = _context.Reviews.AsQueryable();
        if (visible.HasValue)
        {
            query = query.Where(r => r.IsVisible == visible.Value);
        }

        return await query
            .OrderByDescending(r => r.ReviewDate)
            .Select(r => ToDto(r))
            .ToListAsync();
    }

    public async Task<ReviewDto> CreateReviewAsync(ReviewUpsertDto dto)
    {
        var review = new Review
        {
            Id = Guid.NewGuid(),
            CustomerName = dto.CustomerName,
            QuestTitle = dto.QuestTitle,
            Rating = dto.Rating,
            ReviewText = dto.ReviewText,
            ReviewDate = dto.ReviewDate,
            IsVisible = dto.IsVisible,
            IsFeatured = dto.IsFeatured,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        return ToDto(review);
    }

    public async Task<bool> UpdateReviewAsync(Guid id, ReviewUpsertDto dto)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
        {
            return false;
        }

        review.CustomerName = dto.CustomerName;
        review.QuestTitle = dto.QuestTitle;
        review.Rating = dto.Rating;
        review.ReviewText = dto.ReviewText;
        review.ReviewDate = dto.ReviewDate;
        review.IsVisible = dto.IsVisible;
        review.IsFeatured = dto.IsFeatured;
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteReviewAsync(Guid id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
        {
            return false;
        }

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<PromotionDto>> GetPromotionsAsync(bool? active)
    {
        var query = _context.Promotions.AsQueryable();
        if (active.HasValue)
        {
            query = query.Where(p => p.IsActive == active.Value);
        }

        return await query
            .OrderBy(p => p.SortOrder)
            .Select(p => ToDto(p))
            .ToListAsync();
    }

    public async Task<PromotionDto> CreatePromotionAsync(PromotionUpsertDto dto)
    {
        var promotion = new Promotion
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            DiscountText = dto.DiscountText,
            ImageUrl = dto.ImageUrl,
            DisplayMode = dto.DisplayMode,
            ValidFrom = dto.ValidFrom,
            ValidUntil = dto.ValidUntil,
            IsActive = dto.IsActive,
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Promotions.Add(promotion);
        await _context.SaveChangesAsync();
        return ToDto(promotion);
    }

    public async Task<bool> UpdatePromotionAsync(Guid id, PromotionUpsertDto dto)
    {
        var promotion = await _context.Promotions.FindAsync(id);
        if (promotion == null)
        {
            return false;
        }

        promotion.Title = dto.Title;
        promotion.Description = dto.Description;
        promotion.DiscountText = dto.DiscountText;
        promotion.ImageUrl = dto.ImageUrl;
        promotion.DisplayMode = dto.DisplayMode;
        promotion.ValidFrom = dto.ValidFrom;
        promotion.ValidUntil = dto.ValidUntil;
        promotion.IsActive = dto.IsActive;
        promotion.SortOrder = dto.SortOrder;
        promotion.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePromotionAsync(Guid id)
    {
        var promotion = await _context.Promotions.FindAsync(id);
        if (promotion == null)
        {
            return false;
        }

        _context.Promotions.Remove(promotion);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<CertificateDto>> GetCertificatesAsync(bool? visible)
    {
        var query = _context.Certificates.AsQueryable();
        if (visible.HasValue)
        {
            query = query.Where(c => c.IsVisible == visible.Value);
        }

        return await query
            .OrderBy(c => c.SortOrder)
            .Select(c => ToDto(c))
            .ToListAsync();
    }

    public async Task<CertificateDto> CreateCertificateAsync(CertificateUpsertDto dto)
    {
        var certificate = new Certificate
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            IssuedDate = dto.IssuedDate,
            SortOrder = dto.SortOrder,
            IsVisible = dto.IsVisible,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Certificates.Add(certificate);
        await _context.SaveChangesAsync();
        return ToDto(certificate);
    }

    public async Task<bool> UpdateCertificateAsync(Guid id, CertificateUpsertDto dto)
    {
        var certificate = await _context.Certificates.FindAsync(id);
        if (certificate == null)
        {
            return false;
        }

        certificate.Title = dto.Title;
        certificate.Description = dto.Description;
        certificate.ImageUrl = dto.ImageUrl;
        certificate.IssuedDate = dto.IssuedDate;
        certificate.SortOrder = dto.SortOrder;
        certificate.IsVisible = dto.IsVisible;
        certificate.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCertificateAsync(Guid id)
    {
        var certificate = await _context.Certificates.FindAsync(id);
        if (certificate == null)
        {
            return false;
        }

        _context.Certificates.Remove(certificate);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AboutInfoDto?> GetAboutInfoAsync()
    {
        var about = await _context.AboutInfos.FirstOrDefaultAsync();
        return about == null ? null : ToDto(about);
    }

    public async Task UpdateAboutInfoAsync(AboutInfoUpdateDto dto)
    {
        var existing = await _context.AboutInfos.FirstOrDefaultAsync();
        if (existing == null)
        {
            var about = new AboutInfo
            {
                Id = Guid.NewGuid(),
                Title = dto.Title,
                Content = dto.Content,
                Mission = dto.Mission,
                Vision = dto.Vision,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AboutInfos.Add(about);
        }
        else
        {
            existing.Title = dto.Title;
            existing.Content = dto.Content;
            existing.Mission = dto.Mission;
            existing.Vision = dto.Vision;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<SettingsDto?> GetSettingsAsync()
    {
        var settings = await _context.Settings.FirstOrDefaultAsync();
        return settings == null ? null : ToDto(settings);
    }

    public async Task UpdateSettingsAsync(SettingsUpdateDto dto)
    {
        var existing = await _context.Settings.FirstOrDefaultAsync();
        if (existing == null)
        {
            var settings = new Settings
            {
                Id = Guid.NewGuid(),
                VkUrl = dto.VkUrl,
                YoutubeUrl = dto.YoutubeUrl,
                InstagramUrl = dto.InstagramUrl,
                TelegramUrl = dto.TelegramUrl,
                VkIconUrl = dto.VkIconUrl,
                VkIconColor = dto.VkIconColor,
                VkIconBackground = dto.VkIconBackground,
                YoutubeIconUrl = dto.YoutubeIconUrl,
                YoutubeIconColor = dto.YoutubeIconColor,
                YoutubeIconBackground = dto.YoutubeIconBackground,
                InstagramIconUrl = dto.InstagramIconUrl,
                InstagramIconColor = dto.InstagramIconColor,
                InstagramIconBackground = dto.InstagramIconBackground,
                TelegramIconUrl = dto.TelegramIconUrl,
                TelegramIconColor = dto.TelegramIconColor,
                TelegramIconBackground = dto.TelegramIconBackground,
                Address = dto.Address,
                Email = dto.Email,
                NotificationEmail = dto.NotificationEmail,
                SmtpHost = dto.SmtpHost,
                SmtpPort = dto.SmtpPort,
                SmtpUser = dto.SmtpUser,
                SmtpPassword = dto.SmtpPassword,
                SmtpUseSsl = dto.SmtpUseSsl ?? false,
                SmtpFromEmail = dto.SmtpFromEmail,
                SmtpFromName = dto.SmtpFromName,
                NotifyBookingAdmin = dto.NotifyBookingAdmin ?? false,
                NotifyBookingCustomer = dto.NotifyBookingCustomer ?? false,
                BookingEmailTemplateAdmin = dto.BookingEmailTemplateAdmin,
                BookingEmailTemplateCustomer = dto.BookingEmailTemplateCustomer,
                NotifyCertificateAdmin = dto.NotifyCertificateAdmin ?? false,
                NotifyCertificateCustomer = dto.NotifyCertificateCustomer ?? false,
                Phone = dto.Phone,
                LogoUrl = dto.LogoUrl,
                GiftGameLabel = dto.GiftGameLabel,
                GiftGameUrl = dto.GiftGameUrl,
                CertificatePageTitle = dto.CertificatePageTitle,
                CertificatePageDescription = dto.CertificatePageDescription,
                CertificatePagePricing = dto.CertificatePagePricing,
                ReviewsMode = dto.ReviewsMode,
                ReviewsFlampEmbed = dto.ReviewsFlampEmbed,
                BookingDaysAhead = dto.BookingDaysAhead > 0 ? dto.BookingDaysAhead : 10,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Settings.Add(settings);
        }
        else
        {
            existing.VkUrl = dto.VkUrl;
            existing.YoutubeUrl = dto.YoutubeUrl;
            existing.InstagramUrl = dto.InstagramUrl;
            existing.TelegramUrl = dto.TelegramUrl;
            existing.VkIconUrl = dto.VkIconUrl;
            existing.VkIconColor = dto.VkIconColor;
            existing.VkIconBackground = dto.VkIconBackground;
            existing.YoutubeIconUrl = dto.YoutubeIconUrl;
            existing.YoutubeIconColor = dto.YoutubeIconColor;
            existing.YoutubeIconBackground = dto.YoutubeIconBackground;
            existing.InstagramIconUrl = dto.InstagramIconUrl;
            existing.InstagramIconColor = dto.InstagramIconColor;
            existing.InstagramIconBackground = dto.InstagramIconBackground;
            existing.TelegramIconUrl = dto.TelegramIconUrl;
            existing.TelegramIconColor = dto.TelegramIconColor;
            existing.TelegramIconBackground = dto.TelegramIconBackground;
            existing.Address = dto.Address;
            existing.Email = dto.Email;
            existing.NotificationEmail = dto.NotificationEmail;
            existing.SmtpHost = dto.SmtpHost;
            existing.SmtpPort = dto.SmtpPort;
            existing.SmtpUser = dto.SmtpUser;
            existing.SmtpPassword = dto.SmtpPassword;
            existing.SmtpUseSsl = dto.SmtpUseSsl ?? existing.SmtpUseSsl;
            existing.SmtpFromEmail = dto.SmtpFromEmail;
            existing.SmtpFromName = dto.SmtpFromName;
            existing.NotifyBookingAdmin = dto.NotifyBookingAdmin ?? existing.NotifyBookingAdmin;
            existing.NotifyBookingCustomer = dto.NotifyBookingCustomer ?? existing.NotifyBookingCustomer;
            existing.BookingEmailTemplateAdmin =
                dto.BookingEmailTemplateAdmin ?? existing.BookingEmailTemplateAdmin;
            existing.BookingEmailTemplateCustomer =
                dto.BookingEmailTemplateCustomer ?? existing.BookingEmailTemplateCustomer;
            existing.NotifyCertificateAdmin =
                dto.NotifyCertificateAdmin ?? existing.NotifyCertificateAdmin;
            existing.NotifyCertificateCustomer =
                dto.NotifyCertificateCustomer ?? existing.NotifyCertificateCustomer;
            existing.Phone = dto.Phone;
            existing.LogoUrl = dto.LogoUrl;
            existing.GiftGameLabel = dto.GiftGameLabel ?? existing.GiftGameLabel;
            existing.GiftGameUrl = dto.GiftGameUrl ?? existing.GiftGameUrl;
            existing.CertificatePageTitle =
                dto.CertificatePageTitle ?? existing.CertificatePageTitle;
            existing.CertificatePageDescription =
                dto.CertificatePageDescription ?? existing.CertificatePageDescription;
            existing.CertificatePagePricing =
                dto.CertificatePagePricing ?? existing.CertificatePagePricing;
            existing.ReviewsMode = dto.ReviewsMode ?? existing.ReviewsMode;
            existing.ReviewsFlampEmbed = dto.ReviewsFlampEmbed ?? existing.ReviewsFlampEmbed;
            if (dto.BookingDaysAhead > 0)
            {
                existing.BookingDaysAhead = dto.BookingDaysAhead;
            }
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    private static RuleDto ToDto(Rule rule)
    {
        return new RuleDto
        {
            Id = rule.Id,
            Title = rule.Title,
            Content = rule.Content,
            SortOrder = rule.SortOrder,
            IsVisible = rule.IsVisible,
            CreatedAt = rule.CreatedAt,
            UpdatedAt = rule.UpdatedAt
        };
    }

    private static ReviewDto ToDto(Review review)
    {
        return new ReviewDto
        {
            Id = review.Id,
            CustomerName = review.CustomerName,
            QuestTitle = review.QuestTitle,
            Rating = review.Rating,
            ReviewText = review.ReviewText,
            ReviewDate = review.ReviewDate,
            IsVisible = review.IsVisible,
            IsFeatured = review.IsFeatured,
            CreatedAt = review.CreatedAt,
            UpdatedAt = review.UpdatedAt
        };
    }

    private static PromotionDto ToDto(Promotion promotion)
    {
        return new PromotionDto
        {
            Id = promotion.Id,
            Title = promotion.Title,
            Description = promotion.Description,
            DiscountText = promotion.DiscountText,
            ImageUrl = promotion.ImageUrl,
            DisplayMode = promotion.DisplayMode,
            ValidFrom = promotion.ValidFrom,
            ValidUntil = promotion.ValidUntil,
            IsActive = promotion.IsActive,
            SortOrder = promotion.SortOrder,
            CreatedAt = promotion.CreatedAt,
            UpdatedAt = promotion.UpdatedAt
        };
    }

    private static CertificateDto ToDto(Certificate certificate)
    {
        return new CertificateDto
        {
            Id = certificate.Id,
            Title = certificate.Title,
            Description = certificate.Description,
            ImageUrl = certificate.ImageUrl,
            IssuedDate = certificate.IssuedDate,
            SortOrder = certificate.SortOrder,
            IsVisible = certificate.IsVisible,
            CreatedAt = certificate.CreatedAt,
            UpdatedAt = certificate.UpdatedAt
        };
    }

    private static AboutInfoDto ToDto(AboutInfo about)
    {
        return new AboutInfoDto
        {
            Id = about.Id,
            Title = about.Title,
            Content = about.Content,
            Mission = about.Mission,
            Vision = about.Vision,
            UpdatedAt = about.UpdatedAt
        };
    }

    private static SettingsDto ToDto(Settings settings)
    {
        return new SettingsDto
        {
            Id = settings.Id,
            VkUrl = settings.VkUrl,
            YoutubeUrl = settings.YoutubeUrl,
            InstagramUrl = settings.InstagramUrl,
            TelegramUrl = settings.TelegramUrl,
            VkIconUrl = settings.VkIconUrl,
            VkIconColor = settings.VkIconColor,
            VkIconBackground = settings.VkIconBackground,
            YoutubeIconUrl = settings.YoutubeIconUrl,
            YoutubeIconColor = settings.YoutubeIconColor,
            YoutubeIconBackground = settings.YoutubeIconBackground,
            InstagramIconUrl = settings.InstagramIconUrl,
            InstagramIconColor = settings.InstagramIconColor,
            InstagramIconBackground = settings.InstagramIconBackground,
            TelegramIconUrl = settings.TelegramIconUrl,
            TelegramIconColor = settings.TelegramIconColor,
            TelegramIconBackground = settings.TelegramIconBackground,
            Address = settings.Address,
            Email = settings.Email,
            NotificationEmail = settings.NotificationEmail,
            SmtpHost = settings.SmtpHost,
            SmtpPort = settings.SmtpPort,
            SmtpUser = settings.SmtpUser,
            SmtpPassword = settings.SmtpPassword,
            SmtpUseSsl = settings.SmtpUseSsl,
            SmtpFromEmail = settings.SmtpFromEmail,
            SmtpFromName = settings.SmtpFromName,
            NotifyBookingAdmin = settings.NotifyBookingAdmin,
            NotifyBookingCustomer = settings.NotifyBookingCustomer,
            BookingEmailTemplateAdmin = settings.BookingEmailTemplateAdmin,
            BookingEmailTemplateCustomer = settings.BookingEmailTemplateCustomer,
            NotifyCertificateAdmin = settings.NotifyCertificateAdmin,
            NotifyCertificateCustomer = settings.NotifyCertificateCustomer,
            Phone = settings.Phone,
            LogoUrl = settings.LogoUrl,
            GiftGameLabel = settings.GiftGameLabel,
            GiftGameUrl = settings.GiftGameUrl,
            CertificatePageTitle = settings.CertificatePageTitle,
            CertificatePageDescription = settings.CertificatePageDescription,
            CertificatePagePricing = settings.CertificatePagePricing,
            ReviewsMode = settings.ReviewsMode,
            ReviewsFlampEmbed = settings.ReviewsFlampEmbed,
            BookingDaysAhead = settings.BookingDaysAhead,
            UpdatedAt = settings.UpdatedAt
        };
    }
}
