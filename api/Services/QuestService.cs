using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.DTOs.DurationBadges;
using QuestRoomApi.DTOs.Quests;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IQuestService
{
    Task<IReadOnlyList<QuestDto>> GetQuestsAsync(bool? visible);
    Task<QuestDto?> GetQuestAsync(string idOrSlug);
    Task<QuestDto> CreateQuestAsync(QuestUpsertDto dto);
    Task<bool> UpdateQuestAsync(Guid id, QuestUpsertDto dto);
    Task<bool> DeleteQuestAsync(Guid id);
    Task<IReadOnlyList<DurationBadgeDto>> GetDurationBadgesAsync();
}

public class QuestService : IQuestService
{
    private readonly AppDbContext _context;

    public QuestService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<QuestDto>> GetQuestsAsync(bool? visible)
    {
        var query = _context.Quests.AsQueryable();

        if (visible.HasValue)
        {
            query = query.Where(q => q.IsVisible == visible.Value);
        }

        return await query
            .OrderBy(q => q.SortOrder)
            .Select(q => ToDto(q))
            .ToListAsync();
    }

    public async Task<QuestDto?> GetQuestAsync(string idOrSlug)
    {
        Quest? quest;
        if (Guid.TryParse(idOrSlug, out var id))
        {
            quest = await _context.Quests.FindAsync(id);
        }
        else
        {
            var slug = idOrSlug.Trim().ToLowerInvariant();
            quest = await _context.Quests.FirstOrDefaultAsync(q => q.Slug == slug);
        }

        return quest == null ? null : ToDto(quest);
    }

    public async Task<QuestDto> CreateQuestAsync(QuestUpsertDto dto)
    {
        var quest = new Quest
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            Slug = string.Empty,
            Addresses = dto.Addresses,
            Phones = dto.Phones,
            ParticipantsMin = dto.ParticipantsMin,
            ParticipantsMax = dto.ParticipantsMax,
            AgeRestriction = dto.AgeRestriction,
            AgeRating = dto.AgeRating,
            Price = dto.Price,
            Duration = dto.Duration,
            IsNew = dto.IsNew,
            IsVisible = dto.IsVisible,
            MainImage = dto.MainImage,
            Images = dto.Images,
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        quest.Slug = await BuildUniqueSlugAsync(quest.Title, quest.Id);

        _context.Quests.Add(quest);
        await _context.SaveChangesAsync();

        return ToDto(quest);
    }

    public async Task<bool> UpdateQuestAsync(Guid id, QuestUpsertDto dto)
    {
        var quest = await _context.Quests.FindAsync(id);
        if (quest == null)
        {
            return false;
        }

        quest.Title = dto.Title;
        quest.Description = dto.Description;
        quest.Slug = await BuildUniqueSlugAsync(dto.Title, quest.Id);
        quest.Addresses = dto.Addresses;
        quest.Phones = dto.Phones;
        quest.ParticipantsMin = dto.ParticipantsMin;
        quest.ParticipantsMax = dto.ParticipantsMax;
        quest.AgeRestriction = dto.AgeRestriction;
        quest.AgeRating = dto.AgeRating;
        quest.Price = dto.Price;
        quest.Duration = dto.Duration;
        quest.IsNew = dto.IsNew;
        quest.IsVisible = dto.IsVisible;
        quest.MainImage = dto.MainImage;
        quest.Images = dto.Images;
        quest.SortOrder = dto.SortOrder;
        quest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteQuestAsync(Guid id)
    {
        var quest = await _context.Quests.FindAsync(id);
        if (quest == null)
        {
            return false;
        }

        _context.Quests.Remove(quest);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IReadOnlyList<DurationBadgeDto>> GetDurationBadgesAsync()
    {
        return await _context.DurationBadges
            .OrderBy(b => b.Duration)
            .Select(b => new DurationBadgeDto
            {
                Id = b.Id,
                Duration = b.Duration,
                Label = b.Label,
                BadgeImageUrl = b.BadgeImageUrl,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();
    }

    private static QuestDto ToDto(Quest quest)
    {
        return new QuestDto
        {
            Id = quest.Id,
            Title = quest.Title,
            Description = quest.Description,
            Slug = quest.Slug,
            Addresses = quest.Addresses,
            Phones = quest.Phones,
            ParticipantsMin = quest.ParticipantsMin,
            ParticipantsMax = quest.ParticipantsMax,
            AgeRestriction = quest.AgeRestriction,
            AgeRating = quest.AgeRating,
            Price = quest.Price,
            Duration = quest.Duration,
            IsNew = quest.IsNew,
            IsVisible = quest.IsVisible,
            MainImage = quest.MainImage,
            Images = quest.Images,
            SortOrder = quest.SortOrder,
            CreatedAt = quest.CreatedAt,
            UpdatedAt = quest.UpdatedAt
        };
    }

    private async Task<string> BuildUniqueSlugAsync(string title, Guid questId)
    {
        var baseSlug = Slugify(title);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "quest";
        }

        var slug = baseSlug;
        var exists = await _context.Quests.AnyAsync(q => q.Slug == slug && q.Id != questId);
        if (exists)
        {
            slug = $"{baseSlug}-{questId.ToString("N")[..8]}";
        }

        return slug;
    }

    private static string Slugify(string value)
    {
        var trimmed = value.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return string.Empty;
        }

        var builder = new System.Text.StringBuilder();
        var previousDash = false;

        foreach (var ch in trimmed)
        {
            if (char.IsLetterOrDigit(ch))
            {
                builder.Append(char.ToLowerInvariant(ch));
                previousDash = false;
            }
            else if (!previousDash)
            {
                builder.Append('-');
                previousDash = true;
            }
        }

        var slug = builder.ToString().Trim('-');
        return slug;
    }
}
