using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Images;
using QuestRoomApi.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace QuestRoomApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private const int MaxPreviewWidth = 360;

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
        var data = stream.ToArray();

        var image = new ImageAsset
        {
            Id = Guid.NewGuid(),
            FileName = file.FileName,
            ContentType = file.ContentType,
            Data = data,
            CreatedAt = DateTime.UtcNow
        };

        _context.ImageAssets.Add(image);
        await _context.SaveChangesAsync();

        return Ok(ToDto(image, Request));
    }

    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ImageAssetDto>>> GetImages(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var clampedLimit = Math.Clamp(limit, 1, 200);
        var clampedOffset = Math.Max(0, offset);

        var images = await _context.ImageAssets
            .AsNoTracking()
            .OrderByDescending(i => i.CreatedAt)
            .Skip(clampedOffset)
            .Take(clampedLimit)
            .ToListAsync();

        return Ok(images.Select(image => ToDto(image, Request)).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetImage(
        Guid id,
        [FromQuery(Name = "w")] int? width,
        [FromQuery(Name = "q")] int? quality,
        [FromQuery] string? format)
    {
        var image = await _context.ImageAssets.FirstOrDefaultAsync(i => i.Id == id);
        if (image == null)
            return NotFound();

        if (!ShouldTransform(width, quality, format))
            return File(image.Data, image.ContentType, image.FileName);

        try
        {
            var transformedImage = BuildTransformedImage(image, width, quality, format);
            return File(transformedImage.Data, transformedImage.ContentType);
        }
        catch
        {
            return File(image.Data, image.ContentType, image.FileName);
        }
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteImage(Guid id)
    {
        var image = await _context.ImageAssets.FirstOrDefaultAsync(i => i.Id == id);
        if (image == null)
            return NotFound();

        _context.ImageAssets.Remove(image);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static bool ShouldTransform(int? width, int? quality, string? format)
    {
        return width.HasValue || quality.HasValue || !string.IsNullOrWhiteSpace(format);
    }

    private static (byte[] Data, string ContentType) BuildTransformedImage(
        ImageAsset image,
        int? width,
        int? quality,
        string? format)
    {
        var requestedWidth = Math.Clamp(width ?? MaxPreviewWidth, 80, 2200);
        var requestedQuality = Math.Clamp(quality ?? 72, 35, 95);
        var requestedFormat = format?.Trim().ToLowerInvariant() ?? "auto";

        using var sourceImage = Image.Load(image.Data);
        var sourceFormat = sourceImage.Metadata.DecodedImageFormat;
        if (sourceImage.Width > requestedWidth)
        {
            var nextHeight = (int)Math.Round((double)sourceImage.Height * requestedWidth / sourceImage.Width);
            sourceImage.Mutate(ctx => ctx.Resize(requestedWidth, Math.Max(1, nextHeight)));
        }

        var (encoder, contentType) = ResolveEncoderAndContentType(sourceFormat, requestedFormat, requestedQuality);

        using var output = new MemoryStream();
        sourceImage.Save(output, encoder);
        return (output.ToArray(), contentType);
    }

    private static (IImageEncoder Encoder, string ContentType) ResolveEncoderAndContentType(
        IImageFormat? sourceFormat,
        string requestedFormat,
        int quality)
    {
        if (requestedFormat == "avif")
        {
            requestedFormat = "webp";
        }

        var sourceFormatName = sourceFormat?.Name;

        if (requestedFormat == "webp" || (requestedFormat == "auto" && !string.Equals(sourceFormatName, "png", StringComparison.OrdinalIgnoreCase)))
        {
            return (new WebpEncoder { Quality = quality }, "image/webp");
        }

        if (string.Equals(sourceFormatName, "png", StringComparison.OrdinalIgnoreCase) && requestedFormat == "auto")
        {
            return (new SixLabors.ImageSharp.Formats.Png.PngEncoder(), "image/png");
        }

        return (new JpegEncoder { Quality = quality }, "image/jpeg");
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
            CreatedAt = image.CreatedAt,
            SizeBytes = image.Data.LongLength
        };
    }

}
