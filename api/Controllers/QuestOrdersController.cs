using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using QuestRoomApi.Services;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/quests")]
public class QuestOrdersController : ControllerBase
{
    private readonly IMirKvestovIntegrationService _integrationService;
    private readonly IApiRequestLogService _requestLogService;

    public QuestOrdersController(
        IMirKvestovIntegrationService integrationService,
        IApiRequestLogService requestLogService)
    {
        _integrationService = integrationService;
        _requestLogService = requestLogService;
    }

    [HttpPost("{questSlug}")]
    public async Task<IActionResult> CreateOrder(string questSlug)
    {
        var request = await MirKvestovOrderRequestReader.ReadOrderRequestAsync(
            Request,
            HttpContext.RequestAborted);
        var payload = request == null
            ? await MirKvestovOrderRequestReader.ReadBodyAsync(
                Request,
                HttpContext.RequestAborted)
            : JsonSerializer.Serialize(
                request,
                new JsonSerializerOptions
                {
                    DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
                });
        await _requestLogService.LogMirKvestovAsync(
            Request.Path,
            Request.Method,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.QueryString.Value,
            payload,
            HttpContext.RequestAborted);
        if (request == null)
        {
            return Ok(new { success = false, message = "Некорректный запрос" });
        }

        var result = await _integrationService.CreateBookingAsync(
            questSlug,
            request,
            HttpContext.RequestAborted);

        if (result.Success)
        {
            return Ok(new { success = true });
        }

        return Ok(new { success = false, message = result.Message ?? "Ошибка" });
    }
}
