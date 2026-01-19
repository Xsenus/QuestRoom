using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Images;
using QuestRoomApi.Models;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ImagesController(AppDbContext context)
    {
        _context = context;
    }

    [Authorize(Roles = "admin")]
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ImageAssetDto>> UploadImage([FromForm] IFormFile file)
    {
        if (file.Length == 0)
            return BadRequest(new { message = "Файл пустой" });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);

        var image = new ImageAsset
        {
            Id = Guid.NewGuid(),
            FileName = file.FileName,
            ContentType = file.ContentType,
            Data = stream.ToArray(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ImageAssets.Add(image);
        await _context.SaveChangesAsync();

        return Ok(ToDto(image, Request));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetImage(Guid id)
    {
        var image = await _context.ImageAssets.FirstOrDefaultAsync(i => i.Id == id);
        if (image == null)
            return NotFound();

        return File(image.Data, image.ContentType, image.FileName);
    }

    private static ImageAssetDto ToDto(ImageAsset image, HttpRequest request)
    {
        var baseUrl = $"{request.Scheme}://{request.Host}";
        return new ImageAssetDto
        {
            Id = image.Id,
            FileName = image.FileName,
            ContentType = image.ContentType,
            Url = $"{baseUrl}/api/images/{image.Id}",
            CreatedAt = image.CreatedAt
        };
    }
}
