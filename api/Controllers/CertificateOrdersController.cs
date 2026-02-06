using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.CertificateOrders;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CertificateOrdersController : PermissionAwareControllerBase
{
    private readonly ICertificateOrderService _service;

    public CertificateOrdersController(ICertificateOrderService service, AppDbContext context) : base(context)
    {
        _service = service;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CertificateOrderDto>>> GetCertificateOrders()
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "certificate-orders.view"))
        {
            return Forbid();
        }

        var orders = await _service.GetCertificateOrdersAsync();
        return Ok(orders);
    }

    [HttpPost]
    public async Task<ActionResult<CertificateOrderDto>> CreateCertificateOrder(
        [FromBody] CertificateOrderCreateDto order)
    {
        var created = await _service.CreateCertificateOrderAsync(order);
        return CreatedAtAction(nameof(GetCertificateOrders), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCertificateOrder(Guid id, [FromBody] CertificateOrderUpdateDto order)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "certificate-orders.edit"))
        {
            return Forbid();
        }

        var updated = await _service.UpdateCertificateOrderAsync(id, order);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCertificateOrder(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "certificate-orders.delete"))
        {
            return Forbid();
        }

        var deleted = await _service.DeleteCertificateOrderAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
