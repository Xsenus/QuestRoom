using Microsoft.EntityFrameworkCore;
using QuestRoomApi.Data;
using QuestRoomApi.Models;

namespace QuestRoomApi.Services;

public interface IDatabaseInitializer
{
    Task InitializeAsync();
}

public class DatabaseInitializer : IDatabaseInitializer
{
    private readonly AppDbContext _context;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(AppDbContext context, ILogger<DatabaseInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        if (await _context.Database.GetMigrationsAsync() is { } migrations && migrations.Any())
        {
            await _context.Database.MigrateAsync();
        }
        else
        {
            await _context.Database.EnsureCreatedAsync();
        }
        await SeedAsync();
    }

    private async Task SeedAsync()
    {
        if (!await _context.DurationBadges.AnyAsync())
        {
            _context.DurationBadges.AddRange(
                new DurationBadge
                {
                    Id = Guid.NewGuid(),
                    Duration = 60,
                    Label = "60 минут",
                    BadgeImageUrl = null,
                    CreatedAt = DateTime.UtcNow
                },
                new DurationBadge
                {
                    Id = Guid.NewGuid(),
                    Duration = 90,
                    Label = "90 минут",
                    BadgeImageUrl = null,
                    CreatedAt = DateTime.UtcNow
                });
        }

        if (!await _context.Quests.AnyAsync())
        {
            var quest = new Quest
            {
                Id = Guid.NewGuid(),
                Title = "Загадка старого особняка",
                Description = "Атмосферный квест с тайнами и головоломками.",
                Addresses = new[] { "ул. Примерная, 1" },
                Phones = new[] { "+7 (999) 123-45-67" },
                ParticipantsMin = 2,
                ParticipantsMax = 6,
                AgeRestriction = "с 12 лет",
                AgeRating = "12+",
                Price = 2500,
                Duration = 60,
                IsNew = true,
                IsVisible = true,
                MainImage = null,
                Images = Array.Empty<string>(),
                SortOrder = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Quests.Add(quest);

            _context.QuestSchedules.AddRange(
                new QuestSchedule
                {
                    Id = Guid.NewGuid(),
                    QuestId = quest.Id,
                    Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
                    TimeSlot = new TimeOnly(12, 0),
                    Price = quest.Price,
                    IsBooked = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new QuestSchedule
                {
                    Id = Guid.NewGuid(),
                    QuestId = quest.Id,
                    Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
                    TimeSlot = new TimeOnly(15, 0),
                    Price = quest.Price,
                    IsBooked = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
        }

        if (!await _context.Rules.AnyAsync())
        {
            _context.Rules.Add(new Rule
            {
                Id = Guid.NewGuid(),
                Title = "Приходите за 10 минут",
                Content = "Просим вас приходить заранее, чтобы пройти инструктаж.",
                SortOrder = 0,
                IsVisible = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.Reviews.AnyAsync())
        {
            _context.Reviews.Add(new Review
            {
                Id = Guid.NewGuid(),
                CustomerName = "Алексей",
                QuestTitle = "Загадка старого особняка",
                Rating = 5,
                ReviewText = "Очень атмосферно и интересно!",
                ReviewDate = DateOnly.FromDateTime(DateTime.UtcNow),
                IsVisible = true,
                IsFeatured = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.Promotions.AnyAsync())
        {
            _context.Promotions.Add(new Promotion
            {
                Id = Guid.NewGuid(),
                Title = "Скидка на утренние игры",
                Description = "Скидка 10% на будние дни до 12:00.",
                DiscountText = "-10%",
                ImageUrl = null,
                ValidFrom = DateOnly.FromDateTime(DateTime.UtcNow),
                ValidUntil = null,
                IsActive = true,
                SortOrder = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.Certificates.AnyAsync())
        {
            _context.Certificates.Add(new Certificate
            {
                Id = Guid.NewGuid(),
                Title = "Подарочный сертификат",
                Description = "Подарите впечатления близким!",
                ImageUrl = null,
                IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                SortOrder = 0,
                IsVisible = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.AboutInfos.AnyAsync())
        {
            _context.AboutInfos.Add(new AboutInfo
            {
                Id = Guid.NewGuid(),
                Title = "Quest Room",
                Content = "Мы создаем лучшие квесты для вашей команды.",
                Mission = "Дарить эмоции и приключения.",
                Vision = "Стать лидером среди квестов в регионе.",
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.Settings.AnyAsync())
        {
            _context.Settings.Add(new Settings
            {
                Id = Guid.NewGuid(),
                VkUrl = null,
                YoutubeUrl = null,
                InstagramUrl = null,
                TelegramUrl = null,
                Address = "ул. Примерная, 1",
                Email = "info@questroom.local",
                Phone = "+7 (999) 123-45-67",
                LogoUrl = null,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Database migrations applied and seed data ensured.");
    }
}
