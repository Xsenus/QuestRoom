using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.DTOs.CertificateOrders;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CertificateOrdersController : ControllerBase
{
    private readonly ICertificateOrderService _service;

    public CertificateOrdersController(ICertificateOrderService service)
    {
        _service = service;
    }

    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CertificateOrderDto>>> GetCertificateOrders()
    {
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

    [Authorize(Roles = "admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCertificateOrder(Guid id, [FromBody] CertificateOrderUpdateDto order)
    {
        var updated = await _service.UpdateCertificateOrderAsync(id, order);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCertificateOrder(Guid id)
    {
        var deleted = await _service.DeleteCertificateOrderAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
