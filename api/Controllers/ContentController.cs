using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.Content;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IContentService _contentService;
    public ReviewsController(IContentService contentService) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReviewDto>>> GetReviews([FromQuery] bool? visible = null)
    {
        var reviews = await _contentService.GetReviewsAsync(visible);
        return Ok(reviews);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> CreateReview([FromBody] ReviewUpsertDto review)
    {
        var created = await _contentService.CreateReviewAsync(review);
        return CreatedAtAction(nameof(GetReviews), new { id = created.Id }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] ReviewUpsertDto review)
    {
        var updated = await _contentService.UpdateReviewAsync(id, review);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        var deleted = await _contentService.DeleteReviewAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class PromotionsController : ControllerBase
{
    private readonly IContentService _contentService;
    public PromotionsController(IContentService contentService) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PromotionDto>>> GetPromotions([FromQuery] bool? active = null)
    {
        var promotions = await _contentService.GetPromotionsAsync(active);
        return Ok(promotions);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<PromotionDto>> CreatePromotion([FromBody] PromotionUpsertDto promotion)
    {
        var created = await _contentService.CreatePromotionAsync(promotion);
        return CreatedAtAction(nameof(GetPromotions), new { id = created.Id }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePromotion(Guid id, [FromBody] PromotionUpsertDto promotion)
    {
        var updated = await _contentService.UpdatePromotionAsync(id, promotion);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePromotion(Guid id)
    {
        var deleted = await _contentService.DeletePromotionAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class CertificatesController : ControllerBase
{
    private readonly IContentService _contentService;
    public CertificatesController(IContentService contentService) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CertificateDto>>> GetCertificates([FromQuery] bool? visible = null)
    {
        var certificates = await _contentService.GetCertificatesAsync(visible);
        return Ok(certificates);
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<CertificateDto>> CreateCertificate([FromBody] CertificateUpsertDto certificate)
    {
        var created = await _contentService.CreateCertificateAsync(certificate);
        return CreatedAtAction(nameof(GetCertificates), new { id = created.Id }, created);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCertificate(Guid id, [FromBody] CertificateUpsertDto certificate)
    {
        var updated = await _contentService.UpdateCertificateAsync(id, certificate);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCertificate(Guid id)
    {
        var deleted = await _contentService.DeleteCertificateAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}

[ApiController]
[Route("api/[controller]")]
public class AboutController : ControllerBase
{
    private readonly IContentService _contentService;
    public AboutController(IContentService contentService) => _contentService = contentService;

    [HttpGet]
    public async Task<ActionResult<AboutInfoDto>> GetAboutInfo()
    {
        var about = await _contentService.GetAboutInfoAsync();
        if (about == null) return NotFound();
        return Ok(about);
    }

    [Authorize(Roles = "admin")]
    [HttpPut]
    public async Task<IActionResult> UpdateAboutInfo([FromBody] AboutInfoUpdateDto aboutInfo)
    {
        await _contentService.UpdateAboutInfoAsync(aboutInfo);
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IContentService _contentService;
    private readonly IEmailNotificationService _emailNotificationService;

    public SettingsController(
        IContentService contentService,
        IEmailNotificationService emailNotificationService)
    {
        _contentService = contentService;
        _emailNotificationService = emailNotificationService;
    }

    [HttpGet]
    public async Task<ActionResult<SettingsDto>> GetSettings()
    {
        var settings = await _contentService.GetSettingsAsync();
        if (settings == null) return NotFound();
        return Ok(settings);
    }

    [Authorize(Roles = "admin")]
    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] SettingsUpdateDto settings)
    {
        await _contentService.UpdateSettingsAsync(settings);
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpPost("test-email")]
    public async Task<IActionResult> SendTestEmail()
    {
        var result = await _emailNotificationService.SendTestEmailAsync();
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }

    [Authorize(Roles = "admin")]
    [HttpPost("test-email-recipient")]
    public async Task<IActionResult> SendTestEmailToRecipient([FromBody] TestEmailRequestDto request)
    {
        var result = await _emailNotificationService.SendTestEmailAsync(request.Email);
        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { message = result.Message });
    }
}
