using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;

namespace QuestRoomApi.Services;

public class BookingStatusMonitorService : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(30);
    private const string DefaultTimeZone = "Asia/Krasnoyarsk";
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BookingStatusMonitorService> _logger;
    private readonly IConfiguration _configuration;

    public BookingStatusMonitorService(
        IServiceScopeFactory scopeFactory,
        ILogger<BookingStatusMonitorService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await UpdateBookingStatusesAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка при обновлении статусов бронирований.");
        }

        using var timer = new PeriodicTimer(CheckInterval);
        while (!stoppingToken.IsCancellationRequested
            && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await UpdateBookingStatusesAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при обновлении статусов бронирований.");
            }
        }
    }

    private async Task UpdateBookingStatusesAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var timeZoneId = await context.Settings
            .AsNoTracking()
            .Select(s => s.TimeZone)
            .FirstOrDefaultAsync(cancellationToken);

        timeZoneId = string.IsNullOrWhiteSpace(timeZoneId)
            ? _configuration["MirKvestov:TimeZone"]
            : timeZoneId;

        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            timeZoneId = DefaultTimeZone;
        }

        var timeZone = ResolveTimeZone(timeZoneId);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        var bookings = await context.Bookings
            .Include(b => b.QuestSchedule)
            .Where(b => (b.Status ?? string.Empty).ToLower() != "completed"
                && !BookingStatusHelper.CancelledStatuses.Contains((b.Status ?? string.Empty).ToLower()))
            .Where(b => b.QuestSchedule != null)
            .ToListAsync(cancellationToken);

        var updatedCount = 0;
        foreach (var booking in bookings)
        {
            var schedule = booking.QuestSchedule;
            if (schedule == null)
            {
                continue;
            }

            var bookingDateTime = booking.BookingDate.ToDateTime(schedule.TimeSlot);
            if (bookingDateTime <= localNow)
            {
                booking.Status = "completed";
                booking.UpdatedAt = DateTime.UtcNow;
                updatedCount++;
            }
        }

        if (updatedCount > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("Проверка статусов бронирований завершена. Завершено: {Count}.", updatedCount);
    }

    private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
