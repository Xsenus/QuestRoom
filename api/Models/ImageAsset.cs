using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("image_assets")]
public class ImageAsset
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Required]
    [Column("file_name")]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [Column("content_type")]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    [Column("data")]
    public byte[] Data { get; set; } = Array.Empty<byte>();

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
