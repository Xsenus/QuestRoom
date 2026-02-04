using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Users;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IUserPreferencesService
{
    Task<BookingTablePreferencesDto?> GetBookingTableAsync(Guid userId);
    Task SaveBookingTableAsync(Guid userId, BookingTablePreferencesDto preferences);
}

public class UserPreferencesService : IUserPreferencesService
{
    private readonly AppDbContext _context;
    private readonly JsonSerializerOptions _serializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public UserPreferencesService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<BookingTablePreferencesDto?> GetBookingTableAsync(Guid userId)
    {
        var preferences = await _context.UserPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId);
        if (preferences?.BookingTablePreferencesJson == null)
        {
            return null;
        }
        try
        {
            return JsonSerializer.Deserialize<BookingTablePreferencesDto>(
                preferences.BookingTablePreferencesJson,
                _serializerOptions
            );
        }
        catch
        {
            return null;
        }
    }

    public async Task SaveBookingTableAsync(Guid userId, BookingTablePreferencesDto preferences)
    {
        var entry = await _context.UserPreferences
            .FirstOrDefaultAsync(item => item.UserId == userId);
        var json = JsonSerializer.Serialize(preferences, _serializerOptions);
        if (entry == null)
        {
            _context.UserPreferences.Add(new UserPreference
            {
                UserId = userId,
                BookingTablePreferencesJson = json
            });
        }
        else
        {
            entry.BookingTablePreferencesJson = json;
        }
        await _context.SaveChangesAsync();
    }
}
