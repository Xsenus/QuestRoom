using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || !_authService.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Неверный email или пароль" });
        }

        var token = _authService.GenerateJwtToken(user);

        return Ok(new LoginResponse
        {
            Token = token,
            Email = user.Email,
            Role = user.Role
        });
    }

    [HttpPost("register-admin")]
    public async Task<ActionResult> RegisterAdmin([FromBody] LoginRequest request)
    {
        // Check if admin already exists
        var existingAdmin = await _context.Users.FirstOrDefaultAsync(u => u.Role == "admin");
        if (existingAdmin != null)
        {
            return BadRequest(new { message = "Admin user already exists" });
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = _authService.HashPassword(request.Password),
            Role = "admin",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Admin user created successfully" });
    }
}
