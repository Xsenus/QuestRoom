using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

public abstract class PermissionAwareControllerBase : ControllerBase
{
    private readonly AppDbContext _context;

    protected PermissionAwareControllerBase(AppDbContext context)
    {
        _context = context;
    }

    protected async Task<User?> GetCurrentUserAsync()
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

    protected static bool HasPermission(User? user, string permission)
    {
        if (user?.Role == null)
        {
            return false;
        }

        return user.Role.Permissions?.Any(existingPermission =>
            string.Equals(existingPermission?.Trim(), permission, StringComparison.OrdinalIgnoreCase)) == true;
    }
}
