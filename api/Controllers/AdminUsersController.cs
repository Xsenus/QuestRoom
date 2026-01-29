using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.AdminUsers;
using QuestRoomApi.Models;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "admin")]
public class AdminUsersController : ControllerBase
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active",
        "blocked",
        "pending"
    };
    private const string ProtectedAdminEmail = "admin@questroom.local";

    private readonly AppDbContext _context;
    private readonly IAuthService _authService;

    public AdminUsersController(AppDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdminUserDto>>> GetUsers()
    {
        var users = await _context.Users
            .Include(user => user.Role)
            .OrderByDescending(user => user.CreatedAt)
            .Select(user => ToDto(user))
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AdminUserDto>> GetUser(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound();
        }

        return Ok(ToDto(user));
    }

    [HttpPost]
    public async Task<ActionResult<AdminUserDto>> CreateUser([FromBody] AdminUserUpsertDto dto)
    {
        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest("Недопустимый статус пользователя.");
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest("Пароль обязателен при создании пользователя.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var exists = await _context.Users.AnyAsync(user => user.Email.ToLower() == normalizedEmail);
        if (exists)
        {
            return BadRequest("Пользователь с таким email уже существует.");
        }

        var role = await _context.Roles.FindAsync(dto.RoleId);
        if (role == null)
        {
            return BadRequest("Роль не найдена.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            Phone = dto.Phone,
            Status = dto.Status.ToLowerInvariant(),
            RoleId = dto.RoleId,
            Notes = dto.Notes,
            PasswordHash = _authService.HashPassword(dto.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        user.Role = role;

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, ToDto(user));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AdminUserDto>> UpdateUser(Guid id, [FromBody] AdminUserUpsertDto dto)
    {
        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest("Недопустимый статус пользователя.");
        }

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var emailExists = await _context.Users.AnyAsync(
            u => u.Email.ToLower() == normalizedEmail && u.Id != id);
        if (emailExists)
        {
            return BadRequest("Пользователь с таким email уже существует.");
        }

        if (string.Equals(user.Email, ProtectedAdminEmail, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Нельзя изменить email основного администратора.");
        }

        var role = await _context.Roles.FindAsync(dto.RoleId);
        if (role == null)
        {
            return BadRequest("Роль не найдена.");
        }

        user.Name = dto.Name.Trim();
        user.Email = normalizedEmail;
        user.Phone = dto.Phone;
        user.Status = dto.Status.ToLowerInvariant();
        user.RoleId = dto.RoleId;
        user.Notes = dto.Notes;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            user.PasswordHash = _authService.HashPassword(dto.Password);
        }

        await _context.SaveChangesAsync();

        user.Role = role;

        return Ok(ToDto(user));
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult<AdminUserDto>> UpdateStatus(Guid id, [FromBody] AdminUserStatusDto dto)
    {
        if (!AllowedStatuses.Contains(dto.Status))
        {
            return BadRequest("Недопустимый статус пользователя.");
        }

        var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound();
        }

        user.Status = dto.Status.ToLowerInvariant();
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToDto(user));
    }

    [HttpPut("{id}/password")]
    public async Task<IActionResult> UpdatePassword(Guid id, [FromBody] AdminUserPasswordDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        user.PasswordHash = _authService.HashPassword(dto.Password);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound();
        }

        if (string.Equals(user.Email, ProtectedAdminEmail, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Нельзя удалить основного администратора.");
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static AdminUserDto ToDto(User user)
    {
        return new AdminUserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Status = user.Status,
            RoleId = user.RoleId ?? Guid.Empty,
            RoleName = user.Role?.Name ?? string.Empty,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            Notes = user.Notes
        };
    }
}
