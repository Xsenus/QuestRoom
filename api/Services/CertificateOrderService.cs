using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.CertificateOrders;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface ICertificateOrderService
{
    Task<IReadOnlyList<CertificateOrderDto>> GetCertificateOrdersAsync();
    Task<CertificateOrderDto> CreateCertificateOrderAsync(CertificateOrderCreateDto dto);
    Task<bool> UpdateCertificateOrderAsync(Guid id, CertificateOrderUpdateDto dto);
}

public class CertificateOrderService : ICertificateOrderService
{
    private readonly AppDbContext _context;
    private readonly IEmailNotificationService _emailNotificationService;

    public CertificateOrderService(AppDbContext context, IEmailNotificationService emailNotificationService)
    {
        _context = context;
        _emailNotificationService = emailNotificationService;
    }

    public async Task<IReadOnlyList<CertificateOrderDto>> GetCertificateOrdersAsync()
    {
        return await _context.CertificateOrders
            .OrderByDescending(order => order.CreatedAt)
            .Select(order => ToDto(order))
            .ToListAsync();
    }

    public async Task<CertificateOrderDto> CreateCertificateOrderAsync(CertificateOrderCreateDto dto)
    {
        var certificateExists = await _context.Certificates
            .AnyAsync(certificate => certificate.Id == dto.CertificateId);

        if (!certificateExists)
        {
            throw new InvalidOperationException("Сертификат не найден.");
        }

        var order = new CertificateOrder
        {
            Id = Guid.NewGuid(),
            CertificateId = dto.CertificateId,
            CertificateTitle = dto.CertificateTitle,
            CustomerName = dto.CustomerName,
            CustomerPhone = dto.CustomerPhone,
            CustomerEmail = dto.CustomerEmail,
            Notes = dto.Notes,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CertificateOrders.Add(order);
        await _context.SaveChangesAsync();
        await _emailNotificationService.SendCertificateOrderNotificationsAsync(order);

        return ToDto(order);
    }

    public async Task<bool> UpdateCertificateOrderAsync(Guid id, CertificateOrderUpdateDto dto)
    {
        var order = await _context.CertificateOrders.FindAsync(id);
        if (order == null)
        {
            return false;
        }

        if (dto.CustomerName != null)
        {
            order.CustomerName = dto.CustomerName;
        }
        if (dto.CustomerPhone != null)
        {
            order.CustomerPhone = dto.CustomerPhone;
        }
        if (dto.CustomerEmail != null)
        {
            order.CustomerEmail = string.IsNullOrWhiteSpace(dto.CustomerEmail)
                ? null
                : dto.CustomerEmail;
        }
        if (dto.Notes != null)
        {
            order.Notes = dto.Notes;
        }
        if (dto.Status != null)
        {
            order.Status = dto.Status;
        }

        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    private static CertificateOrderDto ToDto(CertificateOrder order)
    {
        return new CertificateOrderDto
        {
            Id = order.Id,
            CertificateId = order.CertificateId,
            CertificateTitle = order.CertificateTitle,
            CustomerName = order.CustomerName,
            CustomerPhone = order.CustomerPhone,
            CustomerEmail = order.CustomerEmail,
            Notes = order.Notes,
            Status = order.Status,
            CreatedAt = order.CreatedAt,
            UpdatedAt = order.UpdatedAt
        };
    }
}
