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
    private enum SeedMode
    {
        None,
        EnsureSeeded,
        Force
    }

    private readonly AppDbContext _context;
    private readonly ILogger<DatabaseInitializer> _logger;
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public DatabaseInitializer(
        AppDbContext context,
        ILogger<DatabaseInitializer> logger,
        IAuthService authService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _authService = authService;
        _configuration = configuration;
    }

    public async Task InitializeAsync()
    {
        if (_context.Database.IsRelational())
        {
            var pending = await _context.Database.GetPendingMigrationsAsync();
            if (pending.Any())
                await _context.Database.MigrateAsync();
            else
                await _context.Database.EnsureCreatedAsync();
        }
        else
        {
            await _context.Database.EnsureCreatedAsync();
        }

        var seedMode = GetSeedMode();
        if (seedMode == SeedMode.None)
        {
            _logger.LogInformation("Database initialized without seed data (SeedMode=None).");
            return;
        }

        await SeedAsync(seedMode);
    }

    private SeedMode GetSeedMode()
    {
        var mode = _configuration.GetValue<string>("DatabaseInitialization:SeedMode")?.Trim();

        return mode?.ToLowerInvariant() switch
        {
            "none" => SeedMode.None,
            "force" => SeedMode.Force,
            "forceseed" => SeedMode.Force,
            "forceseeded" => SeedMode.Force,
            "ensured" => SeedMode.EnsureSeeded,
            "ensure" => SeedMode.EnsureSeeded,
            "ensureseeded" => SeedMode.EnsureSeeded,
            _ => SeedMode.EnsureSeeded
        };
    }

    private async Task SeedAsync(SeedMode seedMode)
    {
        if (seedMode == SeedMode.Force)
        {
            _logger.LogInformation("Force seeding enabled. Clearing existing seed data.");
            await ClearSeedDataAsync();
        }

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
                    Duration = 75,
                    Label = "75 минут",
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
            var now = DateTime.UtcNow;
            var questData = new List<Quest>
            {
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Шерлок",
                    Description = "Лондон Викторианской эпохи. Трущобы, расцвет нищеты и беззакония. Вы, Шерлок Холмс, узнали о готовящейся в Лондоне атаке профессора Мориарти, вычислили его логово и вместе с доктором Ватсоном решили нанести ему визит! Вам необходимо за 75 минут разыскать дневник профессора Мориарти! В нем расписаны все планы преступного гения, а в частности, важная информация о времени и месте атаки, которая поможет вам предотвратить угрозу и спасти Лондон! Спешите!",
                    Addresses = new[] { "ул. Диксона, д.1, стр.4" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 2500,
                    Duration = 75,
                    IsNew = true,
                    IsVisible = true,
                    MainImage = null,
                    Images = Array.Empty<string>(),
                    SortOrder = 1,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Алиса в стране чудес",
                    Description = "Алиса, спасая семью Шляпника, позаимствовала у Времени волшебные хронометры. Но она не успела вовремя вернуть их назад и теперь всему Зазеркалью угрожает большая опасность! Ход истории может полностью остановиться и разрушится ткань мироздания! Вы должны помочь Алисе вернуть хронометры во дворец Времени. Но для начала их нужно найти! Начните поиски с поляны у дома Шляпника, но помните, что у вас всего 75 минут!",
                    Addresses = new[] { "ул. Диксона, д.1, стр.4" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 2500,
                    Duration = 75,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = null,
                    Images = Array.Empty<string>(),
                    SortOrder = 2,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Школа магии Хогвартс",
                    Description = "Вы ученики школы магии и волшебства «Хогвартс». Повторяя очередное заклинание, вы вдруг услышали неистовый крик в коридоре. Выбежав из класса, вы находите записку: «Я вернусь». Теперь в ваших руках судьба всего волшебного мира. Успеете ли вы найти все крестражи и избавиться от Того-Кого-Нельзя-Называть...",
                    Addresses = new[] { "ул. Диксона, д.1, стр.4" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 2500,
                    Duration = 60,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = null,
                    Images = Array.Empty<string>(),
                    SortOrder = 3,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Идеальное ограбление",
                    Description = "Знаменитый коллекционер совершенно непростительным образом владеет редким и драгоценным кольцом. И, что совсем возмутительно, старый скряга не собирается делиться им! Он хитрым способом спрятал сокровище в одной из комнат своего роскошного особняка. К счастью, ваша доблестная шайка справлялась и не с такими мерзавцами. Вам предстоит найти кольцо и вернуть его в натруженные руки законных владельцев.",
                    Addresses = new[] { "ул. Кирова, д.43" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 5,
                    AgeRestriction = "с 10 лет с родителями или нашим аниматором с 16 лет самостоятельно",
                    AgeRating = "16+",
                    Price = 3000,
                    Duration = 90,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = null,
                    Images = Array.Empty<string>(),
                    SortOrder = 4,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Звонок",
                    Description = "На чердаке загородного дома вы нашли кассету. Анонс на обложке обещал незабываемый отдых с друзьями. Обложка была исписана от руки каким-то сумасшедшим. Он предрекал смерть каждому, кто просмотрит это видео, щедро разбавляя текст каракулями на неизвестном языке. Здесь же на чердаке был и видеомагнитофон. С тихим жужжанием кассета вошла внутрь. Не успели вы закончить просмотр, как ваш телефон зазвонил...",
                    Addresses = new[] { "ул. Кирова, д.43" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 2500,
                    Duration = 75,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = null,
                    Images = Array.Empty<string>(),
                    SortOrder = 5,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Ключ от всех дверей",
                    Description = "Один известный во всем мире мастер изготовил магический ключ, который способен открыть абсолютно любую дверь. Вам предстоит пройти сквозь мистический лабиринт, через два десятка дверей и замков, с множеством сюрпризов и загадок. Каждая дверь скрывает свой секрет. Попробуй разгадать все тайны, открыть все двери, найти волшебный ключ и выбраться из лабиринта-ловушки. Удачи!",
                    Addresses = new[] { "ул. Кирова, д.43" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 2500,
                    Duration = 75,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = null,
                    Images = Array.Empty<string>(),
                    SortOrder = 6,
                    CreatedAt = now,
                    UpdatedAt = now
                }
            };

            _context.Quests.AddRange(questData);
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
                InstagramUrl = "https://www.instagram.com/vlovushke_krsk/",
                TelegramUrl = null,
                Address = "г. Красноярск, ул. Кирова, д.43",
                Email = "krsk@vlovushke24.ru",
                Phone = "8 (391) 294-59-50",
                LogoUrl = null,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.Users.AnyAsync(u => u.Role == "admin"))
        {
            var adminEmail = _configuration["AdminUser:Email"];
            var adminPassword = _configuration["AdminUser:Password"];

            if (!string.IsNullOrWhiteSpace(adminEmail) && !string.IsNullOrWhiteSpace(adminPassword))
            {
                _context.Users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    Email = adminEmail,
                    PasswordHash = _authService.HashPassword(adminPassword),
                    Role = "admin",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                _logger.LogWarning("Admin user was not created because AdminUser credentials are missing.");
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Database migrations applied and seed data ensured.");
    }

    private async Task ClearSeedDataAsync()
    {
        _context.Bookings.RemoveRange(await _context.Bookings.ToListAsync());
        _context.QuestSchedules.RemoveRange(await _context.QuestSchedules.ToListAsync());
        _context.QuestPricingRules.RemoveRange(await _context.QuestPricingRules.ToListAsync());
        _context.Quests.RemoveRange(await _context.Quests.ToListAsync());
        _context.DurationBadges.RemoveRange(await _context.DurationBadges.ToListAsync());
        _context.Rules.RemoveRange(await _context.Rules.ToListAsync());
        _context.Reviews.RemoveRange(await _context.Reviews.ToListAsync());
        _context.Promotions.RemoveRange(await _context.Promotions.ToListAsync());
        _context.Certificates.RemoveRange(await _context.Certificates.ToListAsync());
        _context.AboutInfos.RemoveRange(await _context.AboutInfos.ToListAsync());
        _context.Settings.RemoveRange(await _context.Settings.ToListAsync());

        await _context.SaveChangesAsync();
    }
}
