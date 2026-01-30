using System.Text.Json;
using QuestRoomApi.DTOs.Users;

namespace QuestRoomApi.Services;

public interface IUserPreferencesService
{
    Task<BookingTablePreferencesDto?> GetBookingTableAsync(Guid userId);
    Task SaveBookingTableAsync(Guid userId, BookingTablePreferencesDto preferences);
}

public class UserPreferencesService : IUserPreferencesService
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private Dictionary<string, BookingTablePreferencesDto> _cache = new();

    public UserPreferencesService(IWebHostEnvironment environment)
    {
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "user-preferences.json");
        _cache = LoadFromFile();
    }

    public async Task<BookingTablePreferencesDto?> GetBookingTableAsync(Guid userId)
    {
        await _mutex.WaitAsync();
        try
        {
            return _cache.TryGetValue(userId.ToString(), out var preferences)
                ? preferences
                : null;
        }
        finally
        {
            _mutex.Release();
        }
    }

    public async Task SaveBookingTableAsync(Guid userId, BookingTablePreferencesDto preferences)
    {
        await _mutex.WaitAsync();
        try
        {
            _cache[userId.ToString()] = preferences;
            var json = JsonSerializer.Serialize(_cache, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            await File.WriteAllTextAsync(_filePath, json);
        }
        finally
        {
            _mutex.Release();
        }
    }

    private Dictionary<string, BookingTablePreferencesDto> LoadFromFile()
    {
        if (!File.Exists(_filePath))
        {
            return new Dictionary<string, BookingTablePreferencesDto>();
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            var data = JsonSerializer.Deserialize<Dictionary<string, BookingTablePreferencesDto>>(json);
            return data ?? new Dictionary<string, BookingTablePreferencesDto>();
        }
        catch
        {
            return new Dictionary<string, BookingTablePreferencesDto>();
        }
    }
}
