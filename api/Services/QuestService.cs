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
        var query = _context.Quests
            .Include(q => q.ExtraServices)
            .AsQueryable();

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
            quest = await _context.Quests
                .Include(q => q.ExtraServices)
                .FirstOrDefaultAsync(q => q.Id == id);
        }
        else
        {
            var slug = idOrSlug.Trim().ToLowerInvariant();
            quest = await _context.Quests
                .Include(q => q.ExtraServices)
                .FirstOrDefaultAsync(q => q.Slug == slug);
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
            ExtraParticipantsMax = dto.ExtraParticipantsMax,
            ExtraParticipantPrice = dto.ExtraParticipantPrice,
            AgeRestriction = dto.AgeRestriction,
            AgeRating = dto.AgeRating,
            Price = dto.Price,
            Duration = dto.Duration,
            Difficulty = dto.Difficulty,
            DifficultyMax = dto.DifficultyMax > 0 ? dto.DifficultyMax : 5,
            IsNew = dto.IsNew,
            IsVisible = dto.IsVisible,
            MainImage = dto.MainImage,
            Images = dto.Images,
            GiftGameLabel = string.IsNullOrWhiteSpace(dto.GiftGameLabel) ? "Подарить игру" : dto.GiftGameLabel.Trim(),
            GiftGameUrl = string.IsNullOrWhiteSpace(dto.GiftGameUrl) ? "/certificate" : dto.GiftGameUrl.Trim(),
            VideoUrl = string.IsNullOrWhiteSpace(dto.VideoUrl) ? null : dto.VideoUrl.Trim(),
            SortOrder = dto.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var slugSource = string.IsNullOrWhiteSpace(dto.Slug) ? quest.Title : dto.Slug;
        quest.Slug = await BuildUniqueSlugAsync(slugSource, quest.Id);

        _context.Quests.Add(quest);
        await _context.SaveChangesAsync();

        await SyncExtraServicesAsync(quest.Id, dto.ExtraServices);
        await _context.SaveChangesAsync();

        quest.ExtraServices = await _context.QuestExtraServices
            .Where(service => service.QuestId == quest.Id)
            .OrderBy(service => service.CreatedAt)
            .ToListAsync();

        return ToDto(quest);
    }

    public async Task<bool> UpdateQuestAsync(Guid id, QuestUpsertDto dto)
    {
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var quest = await _context.Quests.FirstOrDefaultAsync(q => q.Id == id);
            if (quest == null)
            {
                return false;
            }

            await ApplyQuestUpdateAsync(quest, dto);

            try
            {
                await _context.SaveChangesAsync();
                await SyncExtraServicesAsync(quest.Id, dto.ExtraServices);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (DbUpdateConcurrencyException ex) when (attempt == 0)
            {
                _context.ChangeTracker.Clear();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (!await ResolveQuestConcurrencyAsync(ex))
                {
                    return false;
                }

                await _context.SaveChangesAsync();
                return true;
            }
        }

        return false;
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
            ExtraParticipantsMax = quest.ExtraParticipantsMax,
            ExtraParticipantPrice = quest.ExtraParticipantPrice,
            AgeRestriction = quest.AgeRestriction,
            AgeRating = quest.AgeRating,
            Price = quest.Price,
            Duration = quest.Duration,
            Difficulty = quest.Difficulty,
            DifficultyMax = quest.DifficultyMax,
            IsNew = quest.IsNew,
            IsVisible = quest.IsVisible,
            MainImage = quest.MainImage,
            Images = quest.Images,
            GiftGameLabel = quest.GiftGameLabel,
            GiftGameUrl = quest.GiftGameUrl,
            VideoUrl = quest.VideoUrl,
            SortOrder = quest.SortOrder,
            ExtraServices = quest.ExtraServices
                .OrderBy(service => service.CreatedAt)
                .Select(service => new QuestExtraServiceDto
                {
                    Id = service.Id,
                    Title = service.Title,
                    Price = service.Price
                })
                .ToList(),
            CreatedAt = quest.CreatedAt,
            UpdatedAt = quest.UpdatedAt
        };
    }

    private async Task SyncExtraServicesAsync(Guid questId, List<QuestExtraServiceUpsertDto>? services)
    {
        var normalizedServices = (services ?? new List<QuestExtraServiceUpsertDto>())
            .Select(service => new
            {
                Id = service.Id.HasValue && service.Id.Value != Guid.Empty ? service.Id : null,
                Title = service.Title?.Trim() ?? string.Empty,
                service.Price
            })
            .Where(service => !string.IsNullOrWhiteSpace(service.Title))
            .ToList();

        var existingServices = await _context.QuestExtraServices
            .Where(service => service.QuestId == questId)
            .ToListAsync();

        var incomingIds = normalizedServices
            .Where(service => service.Id.HasValue)
            .Select(service => service.Id!.Value)
            .ToHashSet();

        foreach (var service in existingServices.Where(service => !incomingIds.Contains(service.Id)))
        {
            _context.QuestExtraServices.Remove(service);
        }

        foreach (var dto in normalizedServices)
        {
            if (dto.Id.HasValue)
            {
                var existing = existingServices.FirstOrDefault(service => service.Id == dto.Id.Value);
                if (existing != null)
                {
                    existing.Title = dto.Title;
                    existing.Price = dto.Price;
                    existing.UpdatedAt = DateTime.UtcNow;
                    continue;
                }
            }

            _context.QuestExtraServices.Add(new QuestExtraService
            {
                Id = Guid.NewGuid(),
                QuestId = questId,
                Title = dto.Title,
                Price = dto.Price,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    private static async Task<bool> ResolveQuestConcurrencyAsync(DbUpdateConcurrencyException ex)
    {
        var hasEntries = false;
        foreach (var entry in ex.Entries)
        {
            hasEntries = true;
            var databaseValues = await entry.GetDatabaseValuesAsync();
            if (databaseValues == null)
            {
                entry.State = EntityState.Detached;
                continue;
            }

            entry.OriginalValues.SetValues(databaseValues);
        }

        return hasEntries;
    }

    private async Task ApplyQuestUpdateAsync(Quest quest, QuestUpsertDto dto)
    {
        quest.Title = dto.Title;
        quest.Description = dto.Description;
        var slugSource = string.IsNullOrWhiteSpace(dto.Slug) ? dto.Title : dto.Slug;
        quest.Slug = await BuildUniqueSlugAsync(slugSource, quest.Id);
        quest.Addresses = dto.Addresses;
        quest.Phones = dto.Phones;
        quest.ParticipantsMin = dto.ParticipantsMin;
        quest.ParticipantsMax = dto.ParticipantsMax;
        quest.ExtraParticipantsMax = dto.ExtraParticipantsMax;
        quest.ExtraParticipantPrice = dto.ExtraParticipantPrice;
        quest.AgeRestriction = dto.AgeRestriction;
        quest.AgeRating = dto.AgeRating;
        quest.Price = dto.Price;
        quest.Duration = dto.Duration;
        quest.Difficulty = dto.Difficulty;
        quest.DifficultyMax = dto.DifficultyMax > 0 ? dto.DifficultyMax : 5;
        quest.IsNew = dto.IsNew;
        quest.IsVisible = dto.IsVisible;
        quest.MainImage = dto.MainImage;
        quest.Images = dto.Images;
        quest.GiftGameLabel = string.IsNullOrWhiteSpace(dto.GiftGameLabel) ? "Подарить игру" : dto.GiftGameLabel.Trim();
        quest.GiftGameUrl = string.IsNullOrWhiteSpace(dto.GiftGameUrl) ? "/certificate" : dto.GiftGameUrl.Trim();
        quest.VideoUrl = string.IsNullOrWhiteSpace(dto.VideoUrl) ? null : dto.VideoUrl.Trim();
        quest.SortOrder = dto.SortOrder;
        quest.UpdatedAt = DateTime.UtcNow;

        // Extra services are synced separately after the quest is saved.
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
