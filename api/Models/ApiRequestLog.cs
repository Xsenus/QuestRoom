using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuestRoomApi.Models;

[Table("api_request_logs")]
public class ApiRequestLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("provider")]
    public string Provider { get; set; } = string.Empty;

    [Column("endpoint")]
    public string Endpoint { get; set; } = string.Empty;

    [Column("method")]
    public string Method { get; set; } = string.Empty;

    [Column("ip_address")]
    public string? IpAddress { get; set; }

    [Column("query_string")]
    public string? QueryString { get; set; }

    [Column("payload")]
    public string? Payload { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
