using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using QuestRoomApi.DTOs.MirKvestov;

namespace QuestRoomApi.Controllers;

public static class MirKvestovOrderRequestReader
{
    public static async Task<MirKvestovOrderRequest?> ReadOrderRequestAsync(
        HttpRequest request,
        CancellationToken cancellationToken = default)
    {
        request.EnableBuffering();

        if (request.HasFormContentType)
        {
            var form = await request.ReadFormAsync(cancellationToken);
            return BuildOrderRequest(form);
        }

        var rawBody = await ReadBodyAsync(request, cancellationToken);
        if (!string.IsNullOrWhiteSpace(rawBody))
        {
            try
            {
                var parsedRequest = JsonSerializer.Deserialize<MirKvestovOrderRequest>(
                    rawBody,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                if (parsedRequest != null)
                {
                    return parsedRequest;
                }
            }
            catch (JsonException)
            {
                // Ignore JSON parse errors and try form-encoded fallback.
            }

            var parsed = QueryHelpers.ParseQuery(rawBody);
            if (parsed.Count > 0)
            {
                return BuildOrderRequest(parsed);
            }
        }

        try
        {
            return await JsonSerializer.DeserializeAsync<MirKvestovOrderRequest>(
                request.Body,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                },
                cancellationToken);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static async Task<string> ReadBodyAsync(
        HttpRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Body == null || !request.Body.CanRead)
        {
            return string.Empty;
        }

        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync(cancellationToken);
        request.Body.Position = 0;
        return body;
    }

    private static MirKvestovOrderRequest BuildOrderRequest(IFormCollection data)
    {
        return BuildOrderRequest(key => data[key]);
    }

    private static MirKvestovOrderRequest BuildOrderRequest(
        IReadOnlyDictionary<string, Microsoft.Extensions.Primitives.StringValues> data)
    {
        return BuildOrderRequest(key => data[key]);
    }

    private static MirKvestovOrderRequest BuildOrderRequest(
        Func<string, Microsoft.Extensions.Primitives.StringValues> getValue)
    {
        return new MirKvestovOrderRequest
        {
            FirstName = getValue("first_name"),
            FamilyName = getValue("family_name"),
            Phone = getValue("phone"),
            Email = getValue("email"),
            Comment = getValue("comment"),
            Source = getValue("source"),
            Md5 = getValue("md5"),
            Date = getValue("date"),
            Time = getValue("time"),
            Price = TryParseInt(getValue("price")),
            UniqueId = getValue("unique_id"),
            YourSlotId = getValue("your_slot_id"),
            Players = TryParseInt(getValue("players")),
            Tariff = getValue("tariff")
        };
    }

    private static int? TryParseInt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }
}
