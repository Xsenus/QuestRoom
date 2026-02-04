using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Collections.Generic;
using System.Security.Claims;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Auth;
using QuestRoomApi.Models;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public AuthController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !_authService.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Неверный email или пароль" });
        }

        if (!string.Equals(user.Status, "active", StringComparison.OrdinalIgnoreCase))
        {
            var statusMessage = user.Status?.ToLowerInvariant() switch
            {
                "blocked" => "Пользователь заблокирован. Обратитесь к администратору системы.",
                "pending" => "Ваш профиль проверяется. Ожидайте одобрения администратором системы.",
                _ => "Доступ к аккаунту ограничен. Обратитесь к администратору."
            };
            return Unauthorized(new { message = statusMessage });
        }

        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = _authService.GenerateJwtToken(user);

        return Ok(new LoginResponse
        {
            Token = token,
            Email = user.Email,
            Role = user.Role?.Code ?? string.Empty,
            Permissions = user.Role?.Permissions?.ToList() ?? new List<string>()
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> GetCurrentUser()
    {
        var rawUserId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(rawUserId) || !Guid.TryParse(rawUserId, out var userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return Unauthorized();
        }

        return Ok(new CurrentUserResponse
        {
            Email = user.Email,
            Role = user.Role?.Code ?? string.Empty,
            Permissions = user.Role?.Permissions?.ToList() ?? new List<string>()
        });
    }

    [HttpPost("register-admin")]
    public async Task<ActionResult> RegisterAdmin([FromBody] LoginRequest request)
    {
        // Check if admin already exists
        var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Code == "admin");
        if (adminRole == null)
        {
            return BadRequest(new { message = "Admin role not found" });
        }

        var existingAdmin = await _context.Users.FirstOrDefaultAsync(u => u.RoleId == adminRole.Id);
        if (existingAdmin != null)
        {
            return BadRequest(new { message = "Admin user already exists" });
        }

        var user = new User
        {
            Name = "Администратор",
            Email = request.Email,
            PasswordHash = _authService.HashPassword(request.Password),
            Status = "active",
            RoleId = adminRole.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Admin user created successfully" });
    }
}
