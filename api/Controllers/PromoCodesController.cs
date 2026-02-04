using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.PromoCodes;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PromoCodesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PromoCodesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PromoCodeDto>>> GetPromoCodes()
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promo-codes.view"))
        {
            return Forbid();
        }
        var codes = await _context.PromoCodes
            .OrderByDescending(code => code.CreatedAt)
            .Select(code => ToDto(code))
            .ToListAsync();
        return Ok(codes);
    }

    [HttpPost]
    public async Task<ActionResult<PromoCodeDto>> CreatePromoCode([FromBody] PromoCodeUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promo-codes.edit"))
        {
            return Forbid();
        }
        var exists = await _context.PromoCodes.AnyAsync(code => code.Code.ToLower() == dto.Code.ToLower());
        if (exists)
        {
            return BadRequest("Промокод уже существует.");
        }

        var promo = new PromoCode
        {
            Id = Guid.NewGuid(),
            Code = dto.Code,
            Name = dto.Name,
            Description = dto.Description,
            DiscountType = dto.DiscountType,
            DiscountValue = dto.DiscountValue,
            ValidFrom = dto.ValidFrom,
            ValidUntil = dto.ValidUntil,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.PromoCodes.Add(promo);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPromoCodes), new { id = promo.Id }, ToDto(promo));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePromoCode(Guid id, [FromBody] PromoCodeUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promo-codes.edit"))
        {
            return Forbid();
        }
        var promo = await _context.PromoCodes.FindAsync(id);
        if (promo == null)
        {
            return NotFound();
        }

        promo.Code = dto.Code;
        promo.Name = dto.Name;
        promo.Description = dto.Description;
        promo.DiscountType = dto.DiscountType;
        promo.DiscountValue = dto.DiscountValue;
        promo.ValidFrom = dto.ValidFrom;
        promo.ValidUntil = dto.ValidUntil;
        promo.IsActive = dto.IsActive;
        promo.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePromoCode(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "promo-codes.delete"))
        {
            return Forbid();
        }
        var promo = await _context.PromoCodes.FindAsync(id);
        if (promo == null)
        {
            return NotFound();
        }

        _context.PromoCodes.Remove(promo);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var rawUserId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(rawUserId) || !Guid.TryParse(rawUserId, out var userId))
        {
            return null;
        }

        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    private static bool HasPermission(User? user, string permission)
    {
        return user?.Role?.Permissions?.Contains(permission) == true;
    }

    private static PromoCodeDto ToDto(PromoCode promo)
    {
        return new PromoCodeDto
        {
            Id = promo.Id,
            Code = promo.Code,
            Name = promo.Name,
            Description = promo.Description,
            DiscountType = promo.DiscountType,
            DiscountValue = promo.DiscountValue,
            ValidFrom = promo.ValidFrom,
            ValidUntil = promo.ValidUntil,
            IsActive = promo.IsActive,
            CreatedAt = promo.CreatedAt,
            UpdatedAt = promo.UpdatedAt
        };
    }
}
