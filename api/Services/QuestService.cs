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
    Task<DeleteQuestResult> DeleteQuestAsync(Guid id);
    Task<IReadOnlyList<DurationBadgeDto>> GetDurationBadgesAsync();
}

public enum DeleteQuestResult
{
    Deleted,
    NotFound,
    HasBookings
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
            .Include(q => q.ParentQuest)
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
                .Include(q => q.ParentQuest)
                .FirstOrDefaultAsync(q => q.Id == id);
        }
        else
        {
            var slug = idOrSlug.Trim().ToLowerInvariant();
            quest = await _context.Quests
                .Include(q => q.ExtraServices)
                .Include(q => q.ParentQuest)
                .FirstOrDefaultAsync(q => q.Slug == slug);
        }

        return quest == null ? null : ToDto(quest);
    }

    public async Task<QuestDto> CreateQuestAsync(QuestUpsertDto dto)
    {
        ValidateParticipantsSettings(dto);
        var parentQuest = await ResolveParentQuestAsync(dto.ParentQuestId);
        var quest = new Quest
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            Slug = string.Empty,
            ParentQuestId = parentQuest?.Id,
            Addresses = dto.Addresses,
            Phones = dto.Phones,
            ParticipantsMin = dto.ParticipantsMin,
            ParticipantsMax = dto.ParticipantsMax,
            StandardPriceParticipantsMax = dto.StandardPriceParticipantsMax > 0
                ? dto.StandardPriceParticipantsMax
                : 4,
            ExtraParticipantsMax = dto.ExtraParticipantsMax,
            ExtraParticipantPrice = parentQuest?.ExtraParticipantPrice ?? dto.ExtraParticipantPrice,
            AgeRestriction = dto.AgeRestriction,
            AgeRating = dto.AgeRating,
            Price = parentQuest?.Price ?? dto.Price,
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

    public async Task<DeleteQuestResult> DeleteQuestAsync(Guid id)
    {
        var quest = await _context.Quests.FindAsync(id);
        if (quest == null)
        {
            return DeleteQuestResult.NotFound;
        }

        var hasBookings = await _context.Bookings.AnyAsync(booking => booking.QuestId == id);
        if (hasBookings)
        {
            return DeleteQuestResult.HasBookings;
        }

        _context.Quests.Remove(quest);
        await _context.SaveChangesAsync();
        return DeleteQuestResult.Deleted;
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
        var pricingQuest = quest.ParentQuest ?? quest;
        return new QuestDto
        {
            Id = quest.Id,
            Title = quest.Title,
            Description = quest.Description,
            Slug = quest.Slug,
            ParentQuestId = quest.ParentQuestId,
            Addresses = quest.Addresses,
            Phones = quest.Phones,
            ParticipantsMin = quest.ParticipantsMin,
            ParticipantsMax = quest.ParticipantsMax,
            StandardPriceParticipantsMax = quest.StandardPriceParticipantsMax > 0
                ? quest.StandardPriceParticipantsMax
                : 4,
            ExtraParticipantsMax = quest.ExtraParticipantsMax,
            ExtraParticipantPrice = pricingQuest.ExtraParticipantPrice,
            AgeRestriction = quest.AgeRestriction,
            AgeRating = quest.AgeRating,
            Price = pricingQuest.Price,
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
        ValidateParticipantsSettings(dto);
        var parentQuest = await ResolveParentQuestAsync(dto.ParentQuestId, quest.Id);
        quest.Title = dto.Title;
        quest.Description = dto.Description;
        var slugSource = string.IsNullOrWhiteSpace(dto.Slug) ? dto.Title : dto.Slug;
        quest.Slug = await BuildUniqueSlugAsync(slugSource, quest.Id);
        quest.ParentQuestId = parentQuest?.Id;
        quest.Addresses = dto.Addresses;
        quest.Phones = dto.Phones;
        quest.ParticipantsMin = dto.ParticipantsMin;
        quest.ParticipantsMax = dto.ParticipantsMax;
        quest.StandardPriceParticipantsMax = dto.StandardPriceParticipantsMax > 0
            ? dto.StandardPriceParticipantsMax
            : 4;
        quest.ExtraParticipantsMax = dto.ExtraParticipantsMax;
        quest.ExtraParticipantPrice = parentQuest?.ExtraParticipantPrice ?? dto.ExtraParticipantPrice;
        quest.AgeRestriction = dto.AgeRestriction;
        quest.AgeRating = dto.AgeRating;
        quest.Price = parentQuest?.Price ?? dto.Price;
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


    private static void ValidateParticipantsSettings(QuestUpsertDto dto)
    {
        if (dto.ParticipantsMin < 1)
        {
            throw new InvalidOperationException("Минимальное количество участников должно быть не меньше 1.");
        }

        if (dto.ParticipantsMax < dto.ParticipantsMin)
        {
            throw new InvalidOperationException("Максимальное количество участников не может быть меньше минимального.");
        }

        var standardPriceParticipantsMax = dto.StandardPriceParticipantsMax > 0
            ? dto.StandardPriceParticipantsMax
            : 4;

        if (standardPriceParticipantsMax < dto.ParticipantsMin)
        {
            throw new InvalidOperationException("Максимум участников по стандартной цене не может быть меньше минимума участников.");
        }

        if (standardPriceParticipantsMax > dto.ParticipantsMax)
        {
            throw new InvalidOperationException("Максимум участников по стандартной цене не может быть больше максимума участников.");
        }
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

    private async Task<Quest?> ResolveParentQuestAsync(Guid? parentQuestId, Guid? currentQuestId = null)
    {
        if (!parentQuestId.HasValue)
        {
            return null;
        }

        if (currentQuestId.HasValue && parentQuestId.Value == currentQuestId.Value)
        {
            throw new InvalidOperationException("Квест не может быть родителем самого себя.");
        }

        var parentQuest = await _context.Quests
            .AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == parentQuestId.Value);
        if (parentQuest == null)
        {
            throw new InvalidOperationException("Родительский квест не найден.");
        }

        if (parentQuest.ParentQuestId.HasValue)
        {
            throw new InvalidOperationException("Нельзя назначить копию в качестве родителя.");
        }

        return parentQuest;
    }
}
