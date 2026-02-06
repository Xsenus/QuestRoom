using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Content;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;
    public ReviewsController(IContentService contentService, AppDbContext context) : base(context) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetReviews([FromQuery] bool? visible = null)
    {
        var reviews = await _contentService.GetReviewsAsync(visible);
        return Ok(reviews);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> CreateReview([FromBody] ReviewUpsertDto review)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "reviews.edit"))
        {
            return Forbid();
        }
        var created = await _contentService.CreateReviewAsync(review);
        return CreatedAtAction(nameof(GetReviews), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] ReviewUpsertDto review)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "reviews.edit"))
        {
            return Forbid();
        }
        var updated = await _contentService.UpdateReviewAsync(id, review);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "reviews.delete"))
        {
            return Forbid();
        }
        var deleted = await _contentService.DeleteReviewAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class PromotionsController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;
    public PromotionsController(IContentService contentService, AppDbContext context) : base(context) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PromotionDto>>> GetPromotions([FromQuery] bool? active = null)
    {
        var promotions = await _contentService.GetPromotionsAsync(active);
        return Ok(promotions);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PromotionDto>> CreatePromotion([FromBody] PromotionUpsertDto promotion)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promotions.edit"))
        {
            return Forbid();
        }
        var created = await _contentService.CreatePromotionAsync(promotion);
        return CreatedAtAction(nameof(GetPromotions), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePromotion(Guid id, [FromBody] PromotionUpsertDto promotion)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promotions.edit"))
        {
            return Forbid();
        }
        var updated = await _contentService.UpdatePromotionAsync(id, promotion);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePromotion(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promotions.delete"))
        {
            return Forbid();
        }
        var deleted = await _contentService.DeletePromotionAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class TeaZonesController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;
    public TeaZonesController(IContentService contentService, AppDbContext context) : base(context) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TeaZoneDto>>> GetTeaZones([FromQuery] bool? active = null)
    {
        var teaZones = await _contentService.GetTeaZonesAsync(active);
        return Ok(teaZones);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<TeaZoneDto>> CreateTeaZone([FromBody] TeaZoneUpsertDto teaZone)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "tea-zones.edit"))
        {
            return Forbid();
        }
        var created = await _contentService.CreateTeaZoneAsync(teaZone);
        return CreatedAtAction(nameof(GetTeaZones), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeaZone(Guid id, [FromBody] TeaZoneUpsertDto teaZone)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "tea-zones.edit"))
        {
            return Forbid();
        }
        var updated = await _contentService.UpdateTeaZoneAsync(id, teaZone);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTeaZone(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "tea-zones.delete"))
        {
            return Forbid();
        }
        var deleted = await _contentService.DeleteTeaZoneAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class CertificatesController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;
    public CertificatesController(IContentService contentService, AppDbContext context) : base(context) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CertificateDto>>> GetCertificates([FromQuery] bool? visible = null)
    {
        var certificates = await _contentService.GetCertificatesAsync(visible);
        return Ok(certificates);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<CertificateDto>> CreateCertificate([FromBody] CertificateUpsertDto certificate)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "certificates.edit"))
        {
            return Forbid();
        }
        var created = await _contentService.CreateCertificateAsync(certificate);
        return CreatedAtAction(nameof(GetCertificates), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCertificate(Guid id, [FromBody] CertificateUpsertDto certificate)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "certificates.edit"))
        {
            return Forbid();
        }
        var updated = await _contentService.UpdateCertificateAsync(id, certificate);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCertificate(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "certificates.delete"))
        {
            return Forbid();
        }
        var deleted = await _contentService.DeleteCertificateAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class AboutController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;
    public AboutController(IContentService contentService, AppDbContext context) : base(context) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<AboutInfoDto>> GetAboutInfo()
    {
        var about = await _contentService.GetAboutInfoAsync();
        if (about == null) return NotFound();
        return Ok(about);
    }

    [Authorize]
    [HttpPut]
    public async Task<IActionResult> UpdateAboutInfo([FromBody] AboutInfoUpdateDto aboutInfo)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "about.edit"))
        {
            return Forbid();
        }
        await _contentService.UpdateAboutInfoAsync(aboutInfo);
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class SettingsController : PermissionAwareControllerBase
{
    private readonly IContentService _contentService;
    private readonly IEmailNotificationService _emailNotificationService;
    private readonly IDatabaseBackupService _databaseBackupService;

    public SettingsController(
        IContentService contentService,
        IEmailNotificationService emailNotificationService,
        IDatabaseBackupService databaseBackupService,
        AppDbContext context) : base(context)
    {
        _contentService = contentService;
        _emailNotificationService = emailNotificationService;
        _databaseBackupService = databaseBackupService;
    }

    [HttpGet]
    public async Task<ActionResult<SettingsDto>> GetSettings()
    {
        var settings = await _contentService.GetSettingsAsync();
        if (settings == null) return NotFound();
        return Ok(settings);
    }

    [Authorize]
    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] SettingsUpdateDto settings)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "settings.edit"))
        {
            return Forbid();
        }
        await _contentService.UpdateSettingsAsync(settings);
        return NoContent();
    }

    [Authorize]
    [HttpPost("test-email")]
    public async Task<IActionResult> SendTestEmail()
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "settings.edit"))
        {
            return Forbid();
        }
        var result = await _emailNotificationService.SendTestEmailAsync();
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }

    [Authorize]
    [HttpPost("test-email-recipient")]
    public async Task<IActionResult> SendTestEmailToRecipient([FromBody] TestEmailRequestDto request)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "settings.edit"))
        {
            return Forbid();
        }
        var result = await _emailNotificationService.SendTestEmailAsync(request.Email);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }

    [Authorize]
    [HttpPost("backup")]
    public async Task<IActionResult> BackupDatabase(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "settings.edit"))
        {
            return Forbid();
        }
        var result = await _databaseBackupService.CreateBackupAsync(cancellationToken);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        if (string.IsNullOrWhiteSpace(result.FilePath) || !System.IO.File.Exists(result.FilePath))
        {
            return BadRequest(new { message = "Файл резервной копии не найден." });
        }

        return PhysicalFile(result.FilePath, "application/octet-stream", result.FileName);
    }
}
