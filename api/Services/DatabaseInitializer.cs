using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
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
            var databaseCreator = _context.Database.GetService<IRelationalDatabaseCreator>();

            if (!await databaseCreator.ExistsAsync())
            {
                _logger.LogInformation("Database does not exist. Creating database before applying migrations.");
                await databaseCreator.CreateAsync();
            }

            var migrations = _context.Database.GetMigrations().ToList();
            if (migrations.Count == 0)
            {
                _logger.LogError("No EF Core migrations were found. Database initialization requires migrations.");
                throw new InvalidOperationException("Missing EF Core migrations. Use migrations to initialize the database.");
            }

            await _context.Database.MigrateAsync();

        }
        else
        {
            await _context.Database.EnsureCreatedAsync();
        }


        await NormalizeBookingStatusesAsync();

        var seedMode = GetSeedMode();
        if (seedMode == SeedMode.None)
        {
            _logger.LogInformation("Database initialized without seed data (SeedMode=None).");
            return;
        }

        await SeedAsync(seedMode);
    }



    private async Task NormalizeBookingStatusesAsync()
    {
        var cancelledAliases = new[] { "canceled", "отменено" };

        var bookingsWithNonCanonicalCancelledStatus = await _context.Bookings
            .Where(b => b.Status != null)
            .Where(b => cancelledAliases.Contains(b.Status!.Trim().ToLower()))
            .ToListAsync();

        if (!bookingsWithNonCanonicalCancelledStatus.Any())
        {
            return;
        }

        foreach (var booking in bookingsWithNonCanonicalCancelledStatus)
        {
            booking.Status = BookingStatusHelper.Normalize(booking.Status);
            booking.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation(
            "Normalized non-canonical cancelled booking statuses to canonical 'cancelled': {Count}",
            bookingsWithNonCanonicalCancelledStatus.Count);
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
                    BadgeImageUrl = "/images/other/60min.png",
                    CreatedAt = DateTime.UtcNow
                },
                new DurationBadge
                {
                    Id = Guid.NewGuid(),
                    Duration = 75,
                    Label = "75 минут",
                    BadgeImageUrl = "/images/other/75min.png",
                    CreatedAt = DateTime.UtcNow
                },
                new DurationBadge
                {
                    Id = Guid.NewGuid(),
                    Duration = 90,
                    Label = "90 минут",
                    BadgeImageUrl = "/images/other/90min.png",
                    CreatedAt = DateTime.UtcNow
                });
        }

        if (!await _context.StandardExtraServices.AnyAsync())
        {
            _context.StandardExtraServices.AddRange(
                new StandardExtraService
                {
                    Id = Guid.NewGuid(),
                    Title = "Доплата за ночные сеансы начиная с 21:30",
                    Price = 500,
                    IsActive = true,
                    MandatoryForChildQuests = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new StandardExtraService
                {
                    Id = Guid.NewGuid(),
                    Title = "Доплата за услуги детского аниматора",
                    Price = 1000,
                    IsActive = true,
                    MandatoryForChildQuests = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new StandardExtraService
                {
                    Id = Guid.NewGuid(),
                    Title = "Аренда зоны отдыха для ожидающих гостей",
                    Price = 500,
                    IsActive = true,
                    MandatoryForChildQuests = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new StandardExtraService
                {
                    Id = Guid.NewGuid(),
                    Title = "Аренда зоны для чаепития за 45 минут",
                    Price = 500,
                    IsActive = true,
                    MandatoryForChildQuests = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
        }

        var now = DateTime.UtcNow;
        var questData = new List<Quest>();

        if (!await _context.Quests.AnyAsync())
        {
            questData = new List<Quest>
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
                    StandardPriceParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором; с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 4000,
                    Duration = 75,
                    Difficulty = 2,
                    DifficultyMax = 5,
                    IsNew = true,
                    IsVisible = true,
                    MainImage = "/images/quest/sherlok/0.jpg",
                    Images = new[]
                    {
                        "/images/quest/sherlok/1.jpg",
                        "/images/quest/sherlok/2.jpg",
                        "/images/quest/sherlok/3.jpg",
                        "/images/quest/sherlok/4.jpg"
                    },
                    SortOrder = 1,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Алиса в стране чудес",
                    Description = "Алиса, спасая семью Шляпника, позаимствовала у Времени волшебные хронометры. Но она не успела вовремя вернуть их назад и теперь всему Зазеркалью угрожает большая опасность! Ход истории может полностью остановиться и разрушится ткань мироздания!\n\nВы должны помочь Алисе вернуть хронометры во дворец Времени. Но для начала их нужно найти! Начните поиски с поляны у дома Шляпника, но помните, что у вас всего 75 минут!",
                    Addresses = new[] { "ул. Диксона, д.1, стр.4" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    StandardPriceParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором; с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 4000,
                    Duration = 75,
                    Difficulty = 3,
                    DifficultyMax = 5,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = "/images/quest/alice/0.JPG",
                    Images = new[]
                    {
                        "/images/quest/alice/1.JPG",
                        "/images/quest/alice/2.JPG",
                        "/images/quest/alice/3.JPG",
                        "/images/quest/alice/4.JPG"
                    },
                    SortOrder = 2,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Школа магии Хогвартс",
                    Description = "Вы ученики школы магии и волшебства «Хогвартс». Повторяя очередное заклинание, вы вдруг услышали неистовый крик в коридоре. Выбежав из класса, вы находите записку: «Я вернулся». Теперь в ваших руках судьба всего волшебного мира. Успеете ли вы найти все крестражи и избавиться от Того-Кого-Нельзя-Называть...",
                    Addresses = new[] { "ул. Диксона, д.1, стр.4" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 4,
                    StandardPriceParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором; с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 4000,
                    Duration = 60,
                    Difficulty = 2,
                    DifficultyMax = 5,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = "/images/quest/hog/0.JPG",
                    Images = new[]
                    {
                        "/images/quest/hog/1.JPG",
                        "/images/quest/hog/2.JPG",
                        "/images/quest/hog/3.JPG",
                        "/images/quest/hog/4.JPG"
                    },
                    SortOrder = 3,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Quest
                {
                    Id = Guid.NewGuid(),
                    Title = "Идеальное ограбление",
                    Description = "Знаменитый коллекционер совершенно непростительным образом владеет редким и драгоценным колье. И, что совсем возмутительно, старый скряга не собирается делиться! Он хитрым способом спрятал сокровище в одной из комнат своего роскошного особняка. К счастью, ваша доблестная шайка справлялась и не с такими мерзавцами. Вам предстоит найти колье и вернуть его в натруженные руки законных владельцев.",
                    Addresses = new[] { "ул. Кирова, д.43" },
                    Phones = new[] { "8 (391) 294-59-50" },
                    ParticipantsMin = 2,
                    ParticipantsMax = 5,
                    StandardPriceParticipantsMax = 4,
                    AgeRestriction = "с 10 лет с родителями или нашим аниматором; с 16 лет самостоятельно",
                    AgeRating = "16+",
                    Price = 4500,
                    Duration = 90,
                    Difficulty = 5,
                    DifficultyMax = 5,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = "/images/quest/ograb/0.jpg",
                    Images = new[]
                    {
                        "/images/quest/ograb/1.jpg",
                        "/images/quest/ograb/2.jpg",
                        "/images/quest/ograb/3.jpg",
                        "/images/quest/ograb/4.jpg"
                    },
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
                    StandardPriceParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором; с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 4000,
                    Duration = 75,
                    Difficulty = 2,
                    DifficultyMax = 5,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = "/images/quest/zvonok/0.jpg",
                    Images = new[]
                    {
                        "/images/quest/zvonok/1.jpg",
                        "/images/quest/zvonok/2.jpg",
                        "/images/quest/zvonok/3.jpg",
                        "/images/quest/zvonok/4.jpg"
                    },
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
                    StandardPriceParticipantsMax = 4,
                    AgeRestriction = "с 8 лет с родителями или нашим аниматором; с 14 лет самостоятельно",
                    AgeRating = "12+",
                    Price = 4000,
                    Duration = 75,
                    Difficulty = 2,
                    DifficultyMax = 5,
                    IsNew = false,
                    IsVisible = true,
                    MainImage = "/images/quest/key/0.jpg",
                    Images = new[]
                    {
                        "/images/quest/key/1.jpg",
                        "/images/quest/key/2.jpg",
                        "/images/quest/key/3.jpg",
                        "/images/quest/key/4.jpg"
                    },
                    SortOrder = 6,
                    CreatedAt = now,
                    UpdatedAt = now
                }
            };

            var usedSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var quest in questData)
            {
                quest.Slug = BuildUniqueSlug(quest.Title, quest.Id, usedSlugs);
                usedSlugs.Add(quest.Slug);
            }

            _context.Quests.AddRange(questData);
        }

        List<QuestPricingRule> seededPricingRules = new();
        if (!await _context.QuestPricingRules.AnyAsync())
        {
            var questsForRules = questData.Any()
                ? questData
                : await _context.Quests.ToListAsync();

            seededPricingRules = AddPricingRules(questsForRules, now);
        }

        if (!await _context.QuestWeeklySlots.AnyAsync())
        {
            var questsForTemplates = questData.Any()
                ? questData
                : await _context.Quests.ToListAsync();

            var rulesForTemplates = seededPricingRules.Any()
                ? seededPricingRules
                : await _context.QuestPricingRules.ToListAsync();

            AddScheduleTemplatesFromPricingRules(questsForTemplates, rulesForTemplates, now);
        }

        if (!await _context.Rules.AnyAsync())
        {
            var rules = new[]
            {
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Для участия в квесте необходима команда игроков от 2 до 4 человек.",
                    Content = string.Empty,
                    SortOrder = 0,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "На прохождение квеста у вас ровно 60 минут. Если вы не уложитесь в отведенное время, двери откроются, и смотрители вас выпустят.",
                    Content = string.Empty,
                    SortOrder = 1,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Личные вещи, сумки и телефоны необходимо оставить в запирающемся шкафчике. Не беспокойтесь, с ними ничего не случится. Все, что вам потребуется для прохождения квеста, вы найдете внутри комнаты.",
                    Content = string.Empty,
                    SortOrder = 2,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Ни одно из заданий в наших квестах не требует применения грубой физической силы. Только логика, наблюдательность, смекалка и находчивость.",
                    Content = string.Empty,
                    SortOrder = 3,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Во всех комнатах установлены камеры и микрофоны. В любой нестандартной ситуации смотрители придут к вам на помощь. Если вам нужна подсказка, обратитесь за ней к смотрителю.",
                    Content = string.Empty,
                    SortOrder = 4,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Смотрители сами приведут квест в первоначальный порядок, но старайтесь не оставлять после себя необратимых изменений.",
                    Content = string.Empty,
                    SortOrder = 5,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Не уносите ничего с собой из квестов: главное, что вы можете забрать - это море положительных эмоций и чувство удовлетворения от пройденного испытания.",
                    Content = string.Empty,
                    SortOrder = 6,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Не обсуждайте прохождение квеста после того, как выйдите из квеста, - этим вы можете испортить удовольствие тем, кто еще не играл.",
                    Content = string.Empty,
                    SortOrder = 7,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rule
                {
                    Id = Guid.NewGuid(),
                    Title = "Мы не допускаем на участие в игре людей:",
                    Content = "в возрасте младше 14 лет без сопровождения взрослых или нашего детского аниматора.\nв возрасте младше 8 лет.\nв состоянии алкогольного опьянения.\nв состоянии агрессивного, неадекватного поведения, причиной которого может быть причинен ущерб реквизитам или оборудованию игровых комнат.",
                    SortOrder = 8,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            _context.Rules.AddRange(rules);
        }

        if (!await _context.Reviews.AnyAsync())
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            _context.Reviews.AddRange(
                new Review
                {
                    Id = Guid.NewGuid(),
                    CustomerName = "Алексей",
                    QuestTitle = "Загадка старого особняка",
                    Rating = 5,
                    ReviewText = "Очень атмосферно и интересно!",
                    ReviewDate = today.AddDays(-2),
                    IsVisible = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Review
                {
                    Id = Guid.NewGuid(),
                    CustomerName = "Марина",
                    QuestTitle = "Шерлок",
                    Rating = 5,
                    ReviewText = "Логические загадки супер, команда осталась в восторге.",
                    ReviewDate = today.AddDays(-6),
                    IsVisible = true,
                    IsFeatured = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Review
                {
                    Id = Guid.NewGuid(),
                    CustomerName = "Илья",
                    QuestTitle = "Идеальное ограбление",
                    Rating = 4,
                    ReviewText = "Очень динамично, понравились декорации и атмосфера.",
                    ReviewDate = today.AddDays(-10),
                    IsVisible = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Review
                {
                    Id = Guid.NewGuid(),
                    CustomerName = "Ольга",
                    QuestTitle = "Алиса в стране чудес",
                    Rating = 5,
                    ReviewText = "Сказочно и красиво, детям очень понравилось!",
                    ReviewDate = today.AddDays(-14),
                    IsVisible = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Review
                {
                    Id = Guid.NewGuid(),
                    CustomerName = "Дмитрий",
                    QuestTitle = "Звонок",
                    Rating = 4,
                    ReviewText = "Немного страшно, но именно этого и хотелось.",
                    ReviewDate = today.AddDays(-20),
                    IsVisible = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Review
                {
                    Id = Guid.NewGuid(),
                    CustomerName = "Екатерина",
                    QuestTitle = "Школа магии Хогвартс",
                    Rating = 5,
                    ReviewText = "Очень волшебно! Задания продуманы до мелочей.",
                    ReviewDate = today.AddDays(-28),
                    IsVisible = true,
                    IsFeatured = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            );
        }

        if (!await _context.Promotions.AnyAsync())
        {
            _context.Promotions.Add(new Promotion
            {
                Id = Guid.NewGuid(),
                Title = "Скидка на утренние игры",
                Description = "Скидка 10% на будние дни до 12:00.",
                DiscountText = "-10%",
                ImageUrl = "/images/stock/1.JPG",
                DisplayMode = "image",
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
            var certificates = new[]
            {
                new Certificate
                {
                    Id = Guid.NewGuid(),
                    Title = "Подарочный сертификат №1",
                    Description = "Подарите впечатления близким!",
                    ImageUrl = "/images/certificate/1.png",
                    IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    SortOrder = 0,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Certificate
                {
                    Id = Guid.NewGuid(),
                    Title = "Подарочный сертификат №2",
                    Description = "Сертификат на квест для команды.",
                    ImageUrl = "/images/certificate/2.png",
                    IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    SortOrder = 1,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Certificate
                {
                    Id = Guid.NewGuid(),
                    Title = "Подарочный сертификат №3",
                    Description = "Новый формат подарка для любителей приключений.",
                    ImageUrl = "/images/certificate/3.png",
                    IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    SortOrder = 2,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Certificate
                {
                    Id = Guid.NewGuid(),
                    Title = "Подарочный сертификат №4",
                    Description = "Подарите эмоции и впечатления.",
                    ImageUrl = "/images/certificate/4.png",
                    IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    SortOrder = 3,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Certificate
                {
                    Id = Guid.NewGuid(),
                    Title = "Подарочный сертификат №5",
                    Description = "Сертификат для квестов «Вловушке24».",
                    ImageUrl = "/images/certificate/5.png",
                    IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    SortOrder = 4,
                    IsVisible = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            _context.Certificates.AddRange(certificates);
        }

        if (!await _context.AboutInfos.AnyAsync())
        {
            _context.AboutInfos.Add(new AboutInfo
            {
                Id = Guid.NewGuid(),
                Title = "О проекте",
                Content = "Реалити-квест «Вловушке24» – уникальный шанс оказаться в совершенно новой, интригующей ситуации, где придется проявить нестандартное мышление, наблюдательность, внимательность, смекалку и логику.\n\nЭто командная игра в которой участвуют от 2 до 5 человек, попадающих в одну из запертых квест-комнат, потрясающих атмосферой реальности!\n\nРеалити-квест «Вловушке24» не только правдоподобная имитация экстремальной ситуации, из которой непросто выбраться! Это и 75 или 90 минут незабываемых, неповторимых, свежих, идеально продуманных механических головоломок, хитрых и коварных задач, непредвиденных развязок и сюжетных поворотов через которые Вам предстоит пройти. Да и это лишь малая часть, что ожидает Вас в нашем Квеструме!\n\nМы гарантируем: массу незабываемых впечатлений, бурю положительных эмоций, повышение уровня адреналина в крови, улыбки, азарт и желание идти до конца, чтобы победить!\n\nКвест в реальности «Вловушке24» – это путешествие в чужой, нетронутый мир, полный загадок, тайн и неожиданных сюрпризов. Сможете ли вы из него выбраться?",
                Mission = string.Empty,
                Vision = string.Empty,
                UpdatedAt = DateTime.UtcNow
            });
        }

        if (!await _context.Settings.AnyAsync())
        {
            _context.Settings.Add(new Settings
            {
                Id = Guid.NewGuid(),
                VkUrl = "https://vk.com/vlovushkekrsk",
                YoutubeUrl = null,
                InstagramUrl = "https://www.instagram.com/vlovushke_krsk/",
                TelegramUrl = null,
                VkIconUrl = null,
                VkIconColor = null,
                VkIconBackground = null,
                YoutubeIconUrl = null,
                YoutubeIconColor = null,
                YoutubeIconBackground = null,
                InstagramIconUrl = null,
                InstagramIconColor = null,
                InstagramIconBackground = null,
                TelegramIconUrl = null,
                TelegramIconColor = null,
                TelegramIconBackground = null,
                Address = "г. Красноярск, ул. Кирова, 43",
                Email = "krsk@vlovushke24.ru",
                NotificationEmail = "krsk@vlovushke24.ru",
                Phone = "8 (391) 294-59-50",
                LogoUrl = "/images/logo.png",
                GiftGameLabel = "Подарить игру",
                GiftGameUrl = "/certificate",
                CertificatePageTitle = "Подарочные сертификаты",
                CertificatePageDescription = "Вы можете приобрести как Подарочный сертификат в бумажном виде в нашем фирменном конверте так и Электронный подарочный сертификат на участие в реалити-квестах \"Вловушке24\". Сертификат распространяется на команду от 2 до 4 человек. Использовать сертификат можно в любой локации на выбор участников соответствующий максимальной цене квеста на сайте компании, по предварительной записи. Срок действия подарочных сертификатов - 3 месяца с даты приобретения. Для приобретения Подарочного сертификата позвоните по телефону: 294-59-50 или отправьте заявку на электронную почту - krsk@vlovushke24.ru.",
                CertificatePagePricing = "Стоимость подарочных сертификатов на квесты: \"Ключ от всех дверей\", \"Звонок\", \"Школа магии Хогвартс\", \"Алиса в стране чудес\" и \"Шерлок\" - 3500 руб. (60/75-минутные квесты) и \"Идеальное ограбление\" - 4000 руб. (90-минутный квест).",
                ReviewsMode = "internal",
                ReviewsFlampEmbed = null,
                BookingStatusPlannedColor = "#7c3aed",
                BookingStatusCreatedColor = "#0ea5e9",
                BookingStatusPendingColor = "#f59e0b",
                BookingStatusNotConfirmedColor = "#f97316",
                BookingStatusConfirmedColor = "#22c55e",
                BookingStatusCompletedColor = "#3b82f6",
                BookingStatusCancelledColor = "#ef4444",
                CertificateStatusPendingColor = "#f59e0b",
                CertificateStatusProcessedColor = "#0ea5e9",
                CertificateStatusCompletedColor = "#22c55e",
                CertificateStatusCanceledColor = "#ef4444",
                BookingDaysAhead = 10,
                BookingCutoffMinutes = 10,
                TimeZone = "Asia/Krasnoyarsk",
                PromotionsPerRow = 1,
                TeaZonesPerRow = 2,
                SmtpHost = null,
                SmtpPort = null,
                SmtpUser = null,
                SmtpPassword = null,
                SmtpUseSsl = true,
                SmtpFromEmail = null,
                SmtpFromName = null,
                NotifyBookingAdmin = false,
                NotifyBookingCustomer = false,
                NotifyCertificateAdmin = false,
                NotifyCertificateCustomer = false,
                BackgroundGradientFrom = "#070816",
                BackgroundGradientVia = "#160a2e",
                BackgroundGradientTo = "#2c0b3f",
                ScheduleBackground = null,
                MirKvestovMd5Key = null,
                MirKvestovPrepayMd5Key = null,
                MirKvestovSlotIdFormat = "numeric",
                MirKvestovScheduleDaysAhead = 14,
                MirKvestovScheduleFields = "date,time,is_free,price,discount_price,your_slot_id",
                BookingEmailTemplateAdmin = """
                                            <p><strong>Информация о квесте:</strong></p>
                                            <p>
                                              <strong>Квест:</strong> {{questTitle}}<br />
                                              <strong>Дата, время:</strong> {{bookingDateTime}}<br />
                                              <strong>Цена:</strong> {{totalPrice}} ₽
                                            </p>
                                            <p><strong>Данные клиента:</strong></p>
                                            <p>
                                              Имя: {{customerName}}<br />
                                              Телефон: {{customerPhone}}<br />
                                              Email: {{customerEmail}}<br />
                                              Комментарий: {{notes}}
                                            </p>
                                            <p><strong>Дополнительная информация:</strong></p>
                                            <p>
                                              Участников: {{participantsCount}}<br />
                                              Доп. участники: {{extraParticipantsCount}}<br />
                                              Доп. услуги: {{extraServicesText}}
                                            </p>
                                            <p>
                                              Адрес: {{companyAddress}}<br />
                                              Телефон: {{companyPhone}}
                                            </p>
                                            <p>С уважением,<br />Администрация</p>
                                            """,
                BookingEmailTemplateCustomer = """
                                               <p>Спасибо за бронирование!</p>
                                               <p><strong>Информация о квесте:</strong></p>
                                               <p>
                                                 <strong>Квест:</strong> {{questTitle}}<br />
                                                 <strong>Дата, время:</strong> {{bookingDateTime}}<br />
                                                 <strong>Цена:</strong> {{totalPrice}} ₽
                                               </p>
                                               <p><strong>Ваши данные:</strong></p>
                                               <p>
                                                 Имя: {{customerName}}<br />
                                                 Телефон: {{customerPhone}}<br />
                                                 Email: {{customerEmail}}<br />
                                                 Комментарий: {{notes}}
                                               </p>
                                               <p>
                                                 Адрес: {{companyAddress}}<br />
                                                 Телефон: {{companyPhone}}
                                               </p>
                                               <p>Мы свяжемся с вами для подтверждения бронирования.</p>
                                               """,
                CertificateEmailTemplateAdmin = """
                                                <p><strong>Новая заявка на сертификат:</strong></p>
                                                <p>
                                                  Сертификат: {{certificateTitle}}<br />
                                                  Тип доставки: {{deliveryType}}<br />
                                                  Статус: {{status}}
                                                </p>
                                                <p><strong>Данные клиента:</strong></p>
                                                <p>
                                                  Имя: {{customerName}}<br />
                                                  Телефон: {{customerPhone}}<br />
                                                  Email: {{customerEmail}}<br />
                                                  Комментарий: {{notes}}
                                                </p>
                                                <p>
                                                  Адрес: {{companyAddress}}<br />
                                                  Телефон: {{companyPhone}}
                                                </p>
                                                """,
                CertificateEmailTemplateCustomer = """
                                                   <p>Спасибо за оформление сертификата!</p>
                                                   <p>
                                                     Сертификат: {{certificateTitle}}<br />
                                                     Тип доставки: {{deliveryType}}
                                                   </p>
                                                   <p><strong>Ваши данные:</strong></p>
                                                   <p>
                                                     Имя: {{customerName}}<br />
                                                     Телефон: {{customerPhone}}<br />
                                                     Email: {{customerEmail}}<br />
                                                     Комментарий: {{notes}}
                                                   </p>
                                                   <p>
                                                     Адрес: {{companyAddress}}<br />
                                                     Телефон: {{companyPhone}}
                                                   </p>
                                                   <p>Мы свяжемся с вами для подтверждения заказа.</p>
                                                   """,
                UpdatedAt = DateTime.UtcNow
            });
        }

        var roleSeeds = PermissionCatalog.DefaultRoles;
        var existingRoles = await _context.Roles.ToDictionaryAsync(role => role.Code);

        foreach (var seed in roleSeeds)
        {
            if (existingRoles.TryGetValue(seed.Code, out var existingRole))
            {
                existingRole.Name = seed.Name;
                existingRole.Description = seed.Description;
                existingRole.Permissions = seed.Permissions.ToList();
                existingRole.IsSystem = seed.IsSystem;
                existingRole.UpdatedAt = DateTime.UtcNow;
                continue;
            }

            var role = new Role
            {
                Id = Guid.NewGuid(),
                Code = seed.Code,
                Name = seed.Name,
                Description = seed.Description,
                Permissions = seed.Permissions.ToList(),
                IsSystem = seed.IsSystem,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Roles.Add(role);
            existingRoles[seed.Code] = role;
        }

        var adminRole = existingRoles.TryGetValue("admin", out var roleEntry)
            ? roleEntry
            : null;
        var viewerRole = existingRoles.TryGetValue("viewer", out var viewerEntry)
            ? viewerEntry
            : adminRole;

        var adminEmail = _configuration["AdminUser:Email"];
        var usersWithoutRole = await _context.Users
            .Where(user => user.RoleId == null || user.RoleId == Guid.Empty)
            .ToListAsync();

        if (usersWithoutRole.Count > 0 && (adminRole != null || viewerRole != null))
        {
            foreach (var user in usersWithoutRole)
            {
                if (!string.IsNullOrWhiteSpace(adminEmail) &&
                    adminRole != null &&
                    string.Equals(user.Email, adminEmail, StringComparison.OrdinalIgnoreCase))
                {
                    user.RoleId = adminRole.Id;
                }
                else if (viewerRole != null)
                {
                    user.RoleId = viewerRole.Id;
                }
                else if (adminRole != null)
                {
                    user.RoleId = adminRole.Id;
                }

                user.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (adminRole != null)
        {
            var adminPassword = _configuration["AdminUser:Password"];
            var adminExists = !string.IsNullOrWhiteSpace(adminEmail)
                && await _context.Users.AnyAsync(u => u.Email.ToLower() == adminEmail.ToLower());

            if (!adminExists &&
                !string.IsNullOrWhiteSpace(adminEmail) &&
                !string.IsNullOrWhiteSpace(adminPassword))
            {
                _context.Users.Add(new User
                {
                    Id = Guid.NewGuid(),
                    Name = "Администратор",
                    Email = adminEmail,
                    PasswordHash = _authService.HashPassword(adminPassword),
                    Status = "active",
                    RoleId = adminRole.Id,
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
        _context.CertificateOrders.RemoveRange(await _context.CertificateOrders.ToListAsync());
        _context.QuestSchedules.RemoveRange(await _context.QuestSchedules.ToListAsync());
        _context.QuestScheduleOverrideSlots.RemoveRange(await _context.QuestScheduleOverrideSlots.ToListAsync());
        _context.QuestScheduleOverrides.RemoveRange(await _context.QuestScheduleOverrides.ToListAsync());
        _context.QuestWeeklySlots.RemoveRange(await _context.QuestWeeklySlots.ToListAsync());
        _context.QuestScheduleSettings.RemoveRange(await _context.QuestScheduleSettings.ToListAsync());
        _context.QuestPricingRules.RemoveRange(await _context.QuestPricingRules.ToListAsync());
        _context.Quests.RemoveRange(await _context.Quests.ToListAsync());
        _context.StandardExtraServices.RemoveRange(await _context.StandardExtraServices.ToListAsync());
        _context.DurationBadges.RemoveRange(await _context.DurationBadges.ToListAsync());
        _context.Rules.RemoveRange(await _context.Rules.ToListAsync());
        _context.Reviews.RemoveRange(await _context.Reviews.ToListAsync());
        _context.Promotions.RemoveRange(await _context.Promotions.ToListAsync());
        _context.TeaZones.RemoveRange(await _context.TeaZones.ToListAsync());
        _context.Certificates.RemoveRange(await _context.Certificates.ToListAsync());
        _context.PromoCodes.RemoveRange(await _context.PromoCodes.ToListAsync());
        _context.ProductionCalendarDays.RemoveRange(await _context.ProductionCalendarDays.ToListAsync());
        _context.AboutInfos.RemoveRange(await _context.AboutInfos.ToListAsync());
        _context.Settings.RemoveRange(await _context.Settings.ToListAsync());
        _context.Users.RemoveRange(await _context.Users.ToListAsync());
        _context.Roles.RemoveRange(await _context.Roles.ToListAsync());

        await _context.SaveChangesAsync();
    }

    private List<QuestPricingRule> AddPricingRules(IEnumerable<Quest> quests, DateTime now)
    {
        var questList = quests.ToList();
        var weekDays = new[] { 1, 2, 3, 4, 5 };
        var weekendDays = new[] { 0, 6 };
        var rules = new List<QuestPricingRule>();

        void AddRules(
            string title,
            string workdayPrice1Times,
            string workdayPrice2Times,
            string weekendPrice1Times,
            string weekendPrice2Times,
            int price1Workday,
            int price2Workday,
            int price1Weekend,
            int price2Weekend)
        {
            var quest = questList.FirstOrDefault(q => string.Equals(q.Title, title, StringComparison.OrdinalIgnoreCase));
            if (quest == null)
            {
                return;
            }

            var workdayPrice2 = ParseTimeList(workdayPrice2Times);
            var weekendPrice2 = ParseTimeList(weekendPrice2Times);
            var workdayIntervalFallback = GetIntervalMinutes(workdayPrice2, quest.Duration + 15);
            var weekendIntervalFallback = GetIntervalMinutes(weekendPrice2, quest.Duration + 15);

            rules.AddRange(
                BuildRulesForTimes(quest, $"{title} - будни (пакет 1)", weekDays, workdayPrice1Times, price1Workday, workdayIntervalFallback, now));
            rules.AddRange(
                BuildRulesForTimes(quest, $"{title} - будни (пакет 2)", weekDays, workdayPrice2Times, price2Workday, workdayIntervalFallback, now));
            rules.AddRange(
                BuildRulesForTimes(quest, $"{title} - выходные (пакет 1)", weekendDays, weekendPrice1Times, price1Weekend, weekendIntervalFallback, now));
            rules.AddRange(
                BuildRulesForTimes(quest, $"{title} - выходные (пакет 2)", weekendDays, weekendPrice2Times, price2Weekend, weekendIntervalFallback, now));
        }

        AddRules(
            "Шерлок",
            "10:00;11:30;13:00;14:30;16:00",
            "17:30;19:00;20:30;22:00",
            "9:15",
            "10:45;12:15;13:45;15:15;16:45;18:15;19:45;21:15;22:45",
            4000,
            4500,
            4500,
            5000);

        AddRules(
            "Алиса в стране чудес",
            "10:15;11:45;13:15;14:45;16:15",
            "17:45;19:15;20:45;22:15",
            "9:00",
            "10:30;12:00;13:30;15:00;16:30;18:00;19:30;21:00;22:30",
            4000,
            4500,
            4500,
            5000);

        AddRules(
            "Школа магии Хогвартс",
            "10:00;11:15;12:30;13:45;15:00;16:15",
            "17:30;18:45;20:00;21:15;22:30",
            "9:30",
            "10:45;12:00;13:15;14:30;15:45;17:00;18:15;19:30;20:45;22:00;23:15",
            4000,
            4500,
            4500,
            5000);

        AddRules(
            "Идеальное ограбление",
            "10:45;12:45;14:45;16:45",
            "18:45;20:45;22:45",
            "9:45",
            "11:45;13:45;15:45;17:45;19:45;21:45",
            4500,
            5000,
            5000,
            5500);

        AddRules(
            "Звонок",
            "10:30;12:15;14:00;15:45",
            "17:30;19:15;21:00;22:45",
            "9:30",
            "11:15;13:00;14:45;16:30;18:15;20:00;21:45",
            4000,
            4500,
            4500,
            5000);

        AddRules(
            "Ключ от всех дверей",
            "11:00;12:30;14:00;15:30",
            "17:00;18:30;20:00;21:30;23:00",
            "10:00",
            "11:30;13:00;14:30;16:00;17:30;19:00;20:30;22:00",
            4000,
            4500,
            4500,
            5000);

        if (rules.Any())
        {
            _context.QuestPricingRules.AddRange(rules);
        }

        return rules;
    }

    private void AddScheduleTemplatesFromPricingRules(
        IEnumerable<Quest> quests,
        IEnumerable<QuestPricingRule> rules,
        DateTime now)
    {
        var questList = quests.ToList();
        var ruleList = rules
            .Where(rule => rule.IsActive && !rule.IsBlocked)
            .ToList();

        var slotMap = new Dictionary<string, (int Priority, int Price)>();

        foreach (var rule in ruleList)
        {
            var questId = rule.QuestId;
            var interval = rule.IntervalMinutes;
            if (interval <= 0)
            {
                continue;
            }

            foreach (var dayOfWeek in rule.DaysOfWeek)
            {
                var time = rule.StartTime;
                while (time < rule.EndTime)
                {
                    var key = $"{questId}|{dayOfWeek}|{time}";
                    if (!slotMap.TryGetValue(key, out var existing) ||
                        rule.Priority > existing.Priority ||
                        (rule.Priority == existing.Priority && rule.Price > existing.Price))
                    {
                        slotMap[key] = (rule.Priority, rule.Price);
                    }

                    var nextTime = time.AddMinutes(interval);
                    if (nextTime <= time)
                    {
                        break;
                    }

                    time = nextTime;
                }
            }
        }

        var weeklySlots = new List<QuestWeeklySlot>();
        foreach (var entry in slotMap)
        {
            var parts = entry.Key.Split('|');
            if (parts.Length != 3)
            {
                continue;
            }

            if (!Guid.TryParse(parts[0], out var questId))
            {
                continue;
            }

            if (!int.TryParse(parts[1], out var dayOfWeek))
            {
                continue;
            }

            if (!TimeOnly.TryParse(parts[2], out var timeSlot))
            {
                continue;
            }

            weeklySlots.Add(new QuestWeeklySlot
            {
                Id = Guid.NewGuid(),
                QuestId = questId,
                DayOfWeek = dayOfWeek,
                TimeSlot = timeSlot,
                Price = entry.Value.Price,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        if (weeklySlots.Any())
        {
            _context.QuestWeeklySlots.AddRange(weeklySlots);
        }

        var settingsToAdd = new List<QuestScheduleSettings>();
        foreach (var quest in questList)
        {
            var holidayPrice = ruleList
                .Where(rule => rule.QuestId == quest.Id &&
                    (rule.DaysOfWeek.Contains(0) || rule.DaysOfWeek.Contains(6)))
                .Select(rule => rule.Price)
                .DefaultIfEmpty()
                .Max();

            var shouldSetHolidayPrice = holidayPrice > 0;
            if (!shouldSetHolidayPrice)
            {
                continue;
            }

            settingsToAdd.Add(new QuestScheduleSettings
            {
                Id = Guid.NewGuid(),
                QuestId = quest.Id,
                HolidayPrice = holidayPrice,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        if (settingsToAdd.Any())
        {
            _context.QuestScheduleSettings.AddRange(settingsToAdd);
        }
    }

    private static IEnumerable<QuestPricingRule> BuildRulesForTimes(
        Quest quest,
        string title,
        int[] daysOfWeek,
        string times,
        int price,
        int fallbackIntervalMinutes,
        DateTime now)
    {
        var timeList = ParseTimeList(times);
        if (timeList.Count == 0)
        {
            return Array.Empty<QuestPricingRule>();
        }

        var interval = GetIntervalMinutes(timeList, fallbackIntervalMinutes);
        if (interval <= 0)
        {
            interval = fallbackIntervalMinutes;
        }

        var lastTime = timeList[^1];
        var endTime = lastTime.AddMinutes(interval);
        if (endTime <= lastTime)
        {
            endTime = new TimeOnly(23, 59);
        }

        return new[]
        {
            new QuestPricingRule
            {
                Id = Guid.NewGuid(),
                QuestId = quest.Id,
                QuestIds = new[] { quest.Id },
                Title = title,
                DaysOfWeek = daysOfWeek,
                StartDate = null,
                EndDate = null,
                StartTime = timeList[0],
                EndTime = endTime,
                IntervalMinutes = interval,
                Price = price,
                IsBlocked = false,
                Priority = 1,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            }
        };
    }

    private static List<TimeOnly> ParseTimeList(string value)
    {
        return value
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(time => TimeOnly.Parse(time.Trim()))
            .Order()
            .ToList();
    }

    private static int GetIntervalMinutes(IReadOnlyList<TimeOnly> times, int fallback)
    {
        if (times.Count < 2)
        {
            return fallback;
        }

        var first = times[0].ToTimeSpan();
        var second = times[1].ToTimeSpan();
        var interval = (int)(second - first).TotalMinutes;
        return interval > 0 ? interval : fallback;
    }

    private static string BuildUniqueSlug(string title, Guid questId, ISet<string> existingSlugs)
    {
        var baseSlug = Slugify(title);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "quest";
        }

        var slug = baseSlug;
        if (existingSlugs.Contains(slug))
        {
            slug = $"{baseSlug}-{questId.ToString("N")[..8]}";
        }

        var counter = 1;
        while (existingSlugs.Contains(slug))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
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

        return builder.ToString().Trim('-');
    }
}
