using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.StandardExtraServices;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StandardExtraServicesController : PermissionAwareControllerBase
{
    private readonly IStandardExtraServiceService _service;

    public StandardExtraServicesController(IStandardExtraServiceService service, AppDbContext context) : base(context)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StandardExtraServiceDto>>> GetStandardExtraServices(
        [FromQuery] bool? active = null)
    {
        var services = await _service.GetStandardExtraServicesAsync(active);
        return Ok(services);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<StandardExtraServiceDto>> CreateStandardExtraService(
        [FromBody] StandardExtraServiceUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "extra-services.edit"))
        {
            return Forbid();
        }

        var created = await _service.CreateStandardExtraServiceAsync(dto);
        return CreatedAtAction(nameof(GetStandardExtraServices), new { id = created.Id }, created);
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateStandardExtraService(Guid id, [FromBody] StandardExtraServiceUpsertDto dto)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "extra-services.edit"))
        {
            return Forbid();
        }

        var updated = await _service.UpdateStandardExtraServiceAsync(id, dto);
        return updated ? NoContent() : NotFound();
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteStandardExtraService(Guid id)
    {
        var user = await GetCurrentUserAsync();
        if (!HasPermission(user, "extra-services.delete"))
        {
            return Forbid();
        }

        var deleted = await _service.DeleteStandardExtraServiceAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
