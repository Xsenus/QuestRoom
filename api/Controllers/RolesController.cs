using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Roles;
using QuestRoomApi.Models;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize(Roles = "admin")]
public class RolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public RolesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RoleDto>>> GetRoles()
    {
        var roles = await _context.Roles
            .OrderByDescending(role => role.IsSystem)
            .ThenBy(role => role.Name)
            .Select(role => ToDto(role))
            .ToListAsync();

        return Ok(roles);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RoleDto>> GetRole(Guid id)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null)
        {
            return NotFound();
        }

        return Ok(ToDto(role));
    }

    [HttpGet("permission-groups")]
    public ActionResult<IEnumerable<PermissionGroupDto>> GetPermissionGroups()
    {
        var groups = PermissionCatalog.Groups.Select(group => new PermissionGroupDto
        {
            Id = group.Id,
            Title = group.Title,
            Description = group.Description,
            Permissions = group.Permissions.Select(permission => new PermissionDto
            {
                Id = permission.Id,
                Title = permission.Title,
                Description = permission.Description
            }).ToList()
        }).ToList();

        return Ok(groups);
    }

    [HttpPost]
    public async Task<ActionResult<RoleDto>> CreateRole([FromBody] RoleUpsertDto dto)
    {
        var role = new Role
        {
            Id = Guid.NewGuid(),
            Code = $"custom-{Guid.NewGuid():N}",
            Name = dto.Name.Trim(),
            Description = dto.Description,
            Permissions = dto.Permissions,
            IsSystem = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRole), new { id = role.Id }, ToDto(role));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<RoleDto>> UpdateRole(Guid id, [FromBody] RoleUpsertDto dto)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null)
        {
            return NotFound();
        }

        if (string.Equals(role.Code, "admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Роль администратора нельзя изменять.");
        }

        role.Name = dto.Name.Trim();
        role.Description = dto.Description;
        role.Permissions = dto.Permissions;
        role.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ToDto(role));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null)
        {
            return NotFound();
        }

        if (role.IsSystem)
        {
            return BadRequest("Системные роли нельзя удалить.");
        }

        var hasUsers = await _context.Users.AnyAsync(user => user.RoleId == id);
        if (hasUsers)
        {
            return BadRequest("Нельзя удалить роль с активными пользователями.");
        }

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static RoleDto ToDto(Role role)
    {
        return new RoleDto
        {
            Id = role.Id,
            Code = role.Code,
            Name = role.Name,
            Description = role.Description,
            Permissions = role.Permissions,
            IsSystem = role.IsSystem,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt
        };
    }
}
