using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IApiRequestLogService
{
    Task LogMirKvestovAsync(
        string endpoint,
        string method,
        string? ipAddress,
        string? queryString,
        string? payload,
        CancellationToken cancellationToken = default);
}

public class ApiRequestLogService : IApiRequestLogService
{
    private readonly AppDbContext _context;

    public ApiRequestLogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task LogMirKvestovAsync(
        string endpoint,
        string method,
        string? ipAddress,
        string? queryString,
        string? payload,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var enabled = await _context.Settings
                .AsNoTracking()
                .Select(s => s.MirKvestovApiLoggingEnabled)
                .FirstOrDefaultAsync(cancellationToken);
            if (!enabled)
            {
                return;
            }

            var log = new ApiRequestLog
            {
                Id = Guid.NewGuid(),
                Provider = "mir-kvestov",
                Endpoint = endpoint,
                Method = method,
                IpAddress = ipAddress,
                QueryString = queryString,
                Payload = payload,
                CreatedAt = DateTime.UtcNow
            };

            _context.ApiRequestLogs.Add(log);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Logging should never block API responses.
        }
    }
}
