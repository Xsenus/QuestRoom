using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.Bookings;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IBlacklistService
{
    Task<IReadOnlyList<BlacklistEntryDto>> GetEntriesAsync();
    Task<BlacklistEntryDto> CreateEntryAsync(BlacklistEntryUpsertDto dto);
    Task<bool> UpdateEntryAsync(Guid id, BlacklistEntryUpsertDto dto);
    Task<bool> DeleteEntryAsync(Guid id);
    Task<IReadOnlyList<BlacklistMatchDto>> FindMatchesAsync(string? phone, string? email);
    Task<bool> IsBookingBlockedAsync(string? phone, string? email, bool isApiBooking);
}

public class BlacklistService : IBlacklistService
{
    private static readonly Regex EmailRegex = new(
        @"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PhoneChunkRegex = new(
        @"(?:\+|00)?[\d\s\-().]{7,}",
        RegexOptions.Compiled);

    private readonly AppDbContext _context;

    public BlacklistService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<BlacklistEntryDto>> GetEntriesAsync()
    {
        return await _context.BlacklistEntries
            .OrderByDescending(entry => entry.UpdatedAt)
            .Select(entry => ToDto(entry))
            .ToListAsync();
    }

    public async Task<BlacklistEntryDto> CreateEntryAsync(BlacklistEntryUpsertDto dto)
    {
        ValidateName(dto.Name);

        var phones = NormalizePhones(dto.Phones);
        var emails = NormalizeEmails(dto.Emails);
        EnsureHasContacts(phones, emails);

        var entry = new BlacklistEntry
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Phones = string.Join(';', phones),
            Emails = string.Join(';', emails),
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.BlacklistEntries.Add(entry);
        await _context.SaveChangesAsync();
        return ToDto(entry);
    }

    public async Task<bool> UpdateEntryAsync(Guid id, BlacklistEntryUpsertDto dto)
    {
        var entry = await _context.BlacklistEntries.FindAsync(id);
        if (entry == null)
        {
            return false;
        }

        ValidateName(dto.Name);

        var phones = NormalizePhones(dto.Phones);
        var emails = NormalizeEmails(dto.Emails);
        EnsureHasContacts(phones, emails);

        entry.Name = dto.Name.Trim();
        entry.Phones = string.Join(';', phones);
        entry.Emails = string.Join(';', emails);
        entry.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        entry.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteEntryAsync(Guid id)
    {
        var entry = await _context.BlacklistEntries.FindAsync(id);
        if (entry == null)
        {
            return false;
        }

        _context.BlacklistEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<BlacklistMatchDto>> FindMatchesAsync(string? phone, string? email)
    {
        var candidatePhones = ExtractPhoneCandidates(phone);
        var candidateEmails = ExtractEmailCandidates(email);

        if (candidatePhones.Count == 0 && candidateEmails.Count == 0)
        {
            return Array.Empty<BlacklistMatchDto>();
        }

        var entries = await _context.BlacklistEntries.ToListAsync();
        var matches = new List<BlacklistMatchDto>();

        foreach (var entry in entries)
        {
            var entryPhones = ParseStoredContacts(entry.Phones);
            var entryEmails = ParseStoredContacts(entry.Emails);

            var matchedPhones = entryPhones.Where(candidatePhones.Contains).ToList();
            var matchedEmails = entryEmails.Where(candidateEmails.Contains).ToList();

            if (matchedPhones.Count == 0 && matchedEmails.Count == 0)
            {
                continue;
            }

            matches.Add(new BlacklistMatchDto
            {
                Id = entry.Id,
                Name = entry.Name,
                Comment = entry.Comment,
                MatchedPhones = matchedPhones,
                MatchedEmails = matchedEmails
            });
        }

        return matches;
    }

    public async Task<bool> IsBookingBlockedAsync(string? phone, string? email, bool isApiBooking)
    {
        var settings = await _context.Settings.AsNoTracking().FirstOrDefaultAsync();
        if (settings == null)
        {
            return false;
        }

        var shouldBlock = isApiBooking
            ? settings.BlockBlacklistedApiBookings
            : settings.BlockBlacklistedSiteBookings;

        if (!shouldBlock)
        {
            return false;
        }

        var matches = await FindMatchesAsync(phone, email);
        return matches.Count > 0;
    }

    private static BlacklistEntryDto ToDto(BlacklistEntry entry)
    {
        return new BlacklistEntryDto
        {
            Id = entry.Id,
            Name = entry.Name,
            Phones = ParseStoredContacts(entry.Phones),
            Emails = ParseStoredContacts(entry.Emails),
            Comment = entry.Comment,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }

    public static HashSet<string> ExtractPhoneCandidates(string? input)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(input))
        {
            return result;
        }

        AddNormalizedPhone(result, input);

        foreach (Match match in PhoneChunkRegex.Matches(input))
        {
            AddNormalizedPhone(result, match.Value);
        }

        return result;
    }

    public static HashSet<string> ExtractEmailCandidates(string? input)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(input))
        {
            return result;
        }

        var canonicalInput = CanonicalizePotentialEmail(input);

        AddNormalizedEmail(result, canonicalInput);
        foreach (Match match in EmailRegex.Matches(canonicalInput))
        {
            AddNormalizedEmail(result, match.Value);
        }

        return result;
    }

    public static string? NormalizePhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (digits.Length == 0)
        {
            return null;
        }

        if (digits.StartsWith("00", StringComparison.Ordinal))
        {
            digits = digits[2..];
        }

        if (digits.Length == 11 && digits.StartsWith('8'))
        {
            digits = "7" + digits[1..];
        }
        else if (digits.Length == 10 && digits.StartsWith('9'))
        {
            digits = "7" + digits;
        }

        if (digits.Length < 10 || digits.Length > 15)
        {
            return null;
        }

        return digits;
    }

    public static string? NormalizeEmail(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value
            .Trim()
            .Trim('"', '\'', '<', '>', ',', ';', ':', ')', '(', '[', ']', '{', '}')
            .ToLowerInvariant();

        if (!EmailRegex.IsMatch(normalized))
        {
            return null;
        }

        return normalized;
    }

    private static List<string> NormalizePhones(List<string>? values)
    {
        return (values ?? new List<string>())
            .SelectMany(ExtractPhoneCandidates)
            .Distinct()
            .ToList();
    }

    private static List<string> NormalizeEmails(List<string>? values)
    {
        return (values ?? new List<string>())
            .SelectMany(ExtractEmailCandidates)
            .Distinct()
            .ToList();
    }

    private static void EnsureHasContacts(List<string> phones, List<string> emails)
    {
        if (phones.Count == 0 && emails.Count == 0)
        {
            throw new InvalidOperationException("Нужно указать хотя бы один телефон или email.");
        }
    }

    private static List<string> ParseStoredContacts(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new List<string>();
        }

        return raw
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct()
            .ToList();
    }

    private static void ValidateName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException("Укажите наименование записи черного списка.");
        }
    }

    private static void AddNormalizedPhone(ISet<string> target, string? value)
    {
        var normalized = NormalizePhone(value);
        if (!string.IsNullOrWhiteSpace(normalized))
        {
            target.Add(normalized);
        }
    }

    private static void AddNormalizedEmail(ISet<string> target, string? value)
    {
        var normalized = NormalizeEmail(value);
        if (!string.IsNullOrWhiteSpace(normalized))
        {
            target.Add(normalized);
        }
    }

    private static string CanonicalizePotentialEmail(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var normalized = input
            .Replace("(at)", "@", StringComparison.OrdinalIgnoreCase)
            .Replace("[at]", "@", StringComparison.OrdinalIgnoreCase)
            .Replace("{at}", "@", StringComparison.OrdinalIgnoreCase)
            .Replace(" собака ", "@", StringComparison.OrdinalIgnoreCase)
            .Replace("(dot)", ".", StringComparison.OrdinalIgnoreCase)
            .Replace("[dot]", ".", StringComparison.OrdinalIgnoreCase)
            .Replace("{dot}", ".", StringComparison.OrdinalIgnoreCase)
            .Replace(" точка ", ".", StringComparison.OrdinalIgnoreCase);

        normalized = Regex.Replace(normalized, @"\s+@\s+", "@");
        normalized = Regex.Replace(normalized, @"\s+\.\s+", ".");

        var builder = new StringBuilder(normalized.Length);
        foreach (var ch in normalized)
        {
            builder.Append(char.IsControl(ch) ? ' ' : ch);
        }

        return builder.ToString();
    }
}
