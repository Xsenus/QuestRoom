using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;
    public ReviewsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Review>>> GetReviews([FromQuery] bool? visible = null)
    {
        var query = _context.Reviews.AsQueryable();
        if (visible.HasValue) query = query.Where(r => r.IsVisible == visible.Value);
        return Ok(await query.OrderByDescending(r => r.ReviewDate).ToListAsync());
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Review>> CreateReview([FromBody] Review review)
    {
        review.Id = Guid.NewGuid();
        review.CreatedAt = DateTime.UtcNow;
        review.UpdatedAt = DateTime.UtcNow;
        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetReviews), new { id = review.Id }, review);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReview(Guid id, [FromBody] Review review)
    {
        if (id != review.Id) return BadRequest();
        review.UpdatedAt = DateTime.UtcNow;
        _context.Entry(review).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReview(Guid id)
    {
        var review = await _context.Reviews.FindAsync(id);
        if (review == null) return NotFound();
        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class PromotionsController : ControllerBase
{
    private readonly AppDbContext _context;
    public PromotionsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Promotion>>> GetPromotions([FromQuery] bool? active = null)
    {
        var query = _context.Promotions.AsQueryable();
        if (active.HasValue) query = query.Where(p => p.IsActive == active.Value);
        return Ok(await query.OrderBy(p => p.SortOrder).ToListAsync());
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Promotion>> CreatePromotion([FromBody] Promotion promotion)
    {
        promotion.Id = Guid.NewGuid();
        promotion.CreatedAt = DateTime.UtcNow;
        promotion.UpdatedAt = DateTime.UtcNow;
        _context.Promotions.Add(promotion);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPromotions), new { id = promotion.Id }, promotion);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePromotion(Guid id, [FromBody] Promotion promotion)
    {
        if (id != promotion.Id) return BadRequest();
        promotion.UpdatedAt = DateTime.UtcNow;
        _context.Entry(promotion).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePromotion(Guid id)
    {
        var promotion = await _context.Promotions.FindAsync(id);
        if (promotion == null) return NotFound();
        _context.Promotions.Remove(promotion);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class CertificatesController : ControllerBase
{
    private readonly AppDbContext _context;
    public CertificatesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Certificate>>> GetCertificates([FromQuery] bool? visible = null)
    {
        var query = _context.Certificates.AsQueryable();
        if (visible.HasValue) query = query.Where(c => c.IsVisible == visible.Value);
        return Ok(await query.OrderBy(c => c.SortOrder).ToListAsync());
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<ActionResult<Certificate>> CreateCertificate([FromBody] Certificate certificate)
    {
        certificate.Id = Guid.NewGuid();
        certificate.CreatedAt = DateTime.UtcNow;
        certificate.UpdatedAt = DateTime.UtcNow;
        _context.Certificates.Add(certificate);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCertificates), new { id = certificate.Id }, certificate);
    }

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCertificate(Guid id, [FromBody] Certificate certificate)
    {
        if (id != certificate.Id) return BadRequest();
        certificate.UpdatedAt = DateTime.UtcNow;
        _context.Entry(certificate).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCertificate(Guid id)
    {
        var certificate = await _context.Certificates.FindAsync(id);
        if (certificate == null) return NotFound();
        _context.Certificates.Remove(certificate);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class AboutController : ControllerBase
{
    private readonly AppDbContext _context;
    public AboutController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<AboutInfo>> GetAboutInfo()
    {
        var about = await _context.AboutInfos.FirstOrDefaultAsync();
        if (about == null) return NotFound();
        return Ok(about);
    }

    [Authorize(Roles = "admin")]
    [HttpPut]
    public async Task<IActionResult> UpdateAboutInfo([FromBody] AboutInfo aboutInfo)
    {
        aboutInfo.UpdatedAt = DateTime.UtcNow;

        var existing = await _context.AboutInfos.FirstOrDefaultAsync();
        if (existing == null)
        {
            aboutInfo.Id = Guid.NewGuid();
            _context.AboutInfos.Add(aboutInfo);
        }
        else
        {
            aboutInfo.Id = existing.Id;
            _context.Entry(existing).State = EntityState.Detached;
            _context.Entry(aboutInfo).State = EntityState.Modified;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;
    public SettingsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<Settings>> GetSettings()
    {
        var settings = await _context.Settings.FirstOrDefaultAsync();
        if (settings == null) return NotFound();
        return Ok(settings);
    }

    [Authorize(Roles = "admin")]
    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] Settings settings)
    {
        settings.UpdatedAt = DateTime.UtcNow;

        var existing = await _context.Settings.FirstOrDefaultAsync();
        if (existing == null)
        {
            settings.Id = Guid.NewGuid();
            _context.Settings.Add(settings);
        }
        else
        {
            settings.Id = existing.Id;
            _context.Entry(existing).State = EntityState.Detached;
            _context.Entry(settings).State = EntityState.Modified;
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
