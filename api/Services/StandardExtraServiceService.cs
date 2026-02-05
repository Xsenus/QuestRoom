using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.StandardExtraServices;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IStandardExtraServiceService
{
    Task<IReadOnlyList<StandardExtraServiceDto>> GetStandardExtraServicesAsync(bool? active);
    Task<StandardExtraServiceDto> CreateStandardExtraServiceAsync(StandardExtraServiceUpsertDto dto);
    Task<bool> UpdateStandardExtraServiceAsync(Guid id, StandardExtraServiceUpsertDto dto);
    Task<bool> DeleteStandardExtraServiceAsync(Guid id);
}

public class StandardExtraServiceService : IStandardExtraServiceService
{
    private readonly AppDbContext _context;

    public StandardExtraServiceService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StandardExtraServiceDto>> GetStandardExtraServicesAsync(bool? active)
    {
        var query = _context.StandardExtraServices.AsQueryable();
        if (active.HasValue)
        {
            query = query.Where(service => service.IsActive == active.Value);
        }

        return await query
            .OrderBy(service => service.Title)
            .Select(service => ToDto(service))
            .ToListAsync();
    }

    public async Task<StandardExtraServiceDto> CreateStandardExtraServiceAsync(StandardExtraServiceUpsertDto dto)
    {
        var service = new StandardExtraService
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Price = dto.Price,
            IsActive = dto.IsActive,
            MandatoryForChildQuests = dto.MandatoryForChildQuests,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.StandardExtraServices.Add(service);
        await _context.SaveChangesAsync();
        return ToDto(service);
    }

    public async Task<bool> UpdateStandardExtraServiceAsync(Guid id, StandardExtraServiceUpsertDto dto)
    {
        var service = await _context.StandardExtraServices.FindAsync(id);
        if (service == null)
        {
            return false;
        }

        service.Title = dto.Title.Trim();
        service.Price = dto.Price;
        service.IsActive = dto.IsActive;
        service.MandatoryForChildQuests = dto.MandatoryForChildQuests;
        service.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteStandardExtraServiceAsync(Guid id)
    {
        var service = await _context.StandardExtraServices.FindAsync(id);
        if (service == null)
        {
            return false;
        }

        _context.StandardExtraServices.Remove(service);
        await _context.SaveChangesAsync();
        return true;
    }

    private static StandardExtraServiceDto ToDto(StandardExtraService service)
    {
        return new StandardExtraServiceDto
        {
            Id = service.Id,
            Title = service.Title,
            Price = service.Price,
            IsActive = service.IsActive,
            MandatoryForChildQuests = service.MandatoryForChildQuests,
            CreatedAt = service.CreatedAt,
            UpdatedAt = service.UpdatedAt
        };
    }
}
