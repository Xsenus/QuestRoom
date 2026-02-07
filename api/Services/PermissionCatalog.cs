using System.Linq;

namespace QuestRoomApi.Services;

public record PermissionDefinition(string Id, string Title, string Description);

public record PermissionGroupDefinition(
    string Id,
    string Title,
    string Description,
    IReadOnlyList<PermissionDefinition> Permissions);

public record RoleSeedDefinition(
    string Code,
    string Name,
    string Description,
    IReadOnlyList<string> Permissions,
    bool IsSystem);

public static class PermissionCatalog
{
    public static readonly IReadOnlyList<PermissionGroupDefinition> Groups = new[]
    {
        new PermissionGroupDefinition(
            "quests",
            "Квесты",
            "Управление списком квестов.",
            new[]
            {
                new PermissionDefinition("quests.view", "Просмотр", "Просматривать список квестов и детали."),
                new PermissionDefinition("quests.edit", "Редактирование", "Создавать и изменять данные квестов."),
                new PermissionDefinition("quests.delete", "Удаление", "Удалять квесты.")
            }),
        new PermissionGroupDefinition(
            "extra-services",
            "Дополнительные услуги",
            "Управление дополнительными услугами.",
            new[]
            {
                new PermissionDefinition("extra-services.view", "Просмотр", "Просматривать список дополнительных услуг."),
                new PermissionDefinition("extra-services.edit", "Редактирование", "Создавать и изменять дополнительные услуги."),
                new PermissionDefinition("extra-services.delete", "Удаление", "Удалять дополнительные услуги.")
            }),
        new PermissionGroupDefinition(
            "bookings",
            "Бронирование",
            "Управление бронированиями.",
            new[]
            {
                new PermissionDefinition("bookings.view", "Просмотр", "Просматривать список бронирований и карточки."),
                new PermissionDefinition("bookings.edit", "Редактирование", "Изменять данные бронирований."),
                new PermissionDefinition("bookings.delete", "Удаление", "Удалять бронирования."),
                new PermissionDefinition("bookings.confirm", "Подтверждение", "Подтверждать бронирования."),
                new PermissionDefinition("bookings.import", "Импорт", "Доступ к импорту и подкаталогу импорта.")
            }),
        new PermissionGroupDefinition(
            "calendar-pricing",
            "Календарь: ценовые правила",
            "Настройка ценовых правил в календаре.",
            new[]
            {
                new PermissionDefinition("calendar.pricing.view", "Просмотр", "Просматривать ценовые правила."),
                new PermissionDefinition("calendar.pricing.edit", "Редактирование", "Создавать и изменять ценовые правила."),
                new PermissionDefinition("calendar.pricing.delete", "Удаление", "Удалять ценовые правила.")
            }),
        new PermissionGroupDefinition(
            "calendar-production",
            "Календарь: производственный календарь",
            "Работа с производственным календарем.",
            new[]
            {
                new PermissionDefinition("calendar.production.view", "Просмотр", "Просматривать производственный календарь."),
                new PermissionDefinition("calendar.production.edit", "Редактирование", "Создавать и изменять записи календаря."),
                new PermissionDefinition("calendar.production.delete", "Удаление", "Удалять записи календаря.")
            }),
        new PermissionGroupDefinition(
            "rules",
            "Правила",
            "Управление страницей правил.",
            new[]
            {
                new PermissionDefinition("rules.view", "Просмотр", "Просматривать страницу правил."),
                new PermissionDefinition("rules.edit", "Редактирование", "Изменять страницу правил."),
                new PermissionDefinition("rules.delete", "Удаление", "Удалять правила.")
            }),
        new PermissionGroupDefinition(
            "about",
            "О проекте",
            "Управление страницей информации о проекте.",
            new[]
            {
                new PermissionDefinition("about.view", "Просмотр", "Просматривать информацию о проекте."),
                new PermissionDefinition("about.edit", "Редактирование", "Изменять информацию о проекте."),
                new PermissionDefinition("about.delete", "Удаление", "Удалять информацию о проекте.")
            }),
        new PermissionGroupDefinition(
            "certificates",
            "Сертификаты",
            "Управление сертификатами.",
            new[]
            {
                new PermissionDefinition("certificates.view", "Просмотр", "Просматривать список сертификатов."),
                new PermissionDefinition("certificates.edit", "Редактирование", "Создавать и изменять сертификаты."),
                new PermissionDefinition("certificates.delete", "Удаление", "Удалять сертификаты.")
            }),
        new PermissionGroupDefinition(
            "certificate-orders",
            "Сертификаты: заявки",
            "Управление заявками на сертификаты.",
            new[]
            {
                new PermissionDefinition("certificate-orders.view", "Просмотр", "Просматривать заявки на сертификаты."),
                new PermissionDefinition("certificate-orders.edit", "Редактирование", "Изменять заявки на сертификаты."),
                new PermissionDefinition("certificate-orders.delete", "Удаление", "Удалять заявки на сертификаты.")
            }),
        new PermissionGroupDefinition(
            "reviews",
            "Отзывы",
            "Работа с отзывами клиентов.",
            new[]
            {
                new PermissionDefinition("reviews.view", "Просмотр", "Просматривать отзывы."),
                new PermissionDefinition("reviews.edit", "Редактирование", "Редактировать и публиковать отзывы."),
                new PermissionDefinition("reviews.delete", "Удаление", "Удалять отзывы.")
            }),
        new PermissionGroupDefinition(
            "promotions",
            "Акции",
            "Управление акциями.",
            new[]
            {
                new PermissionDefinition("promotions.view", "Просмотр", "Просматривать акции."),
                new PermissionDefinition("promotions.edit", "Редактирование", "Создавать и изменять акции."),
                new PermissionDefinition("promotions.delete", "Удаление", "Удалять акции.")
            }),
        new PermissionGroupDefinition(
            "tea-zones",
            "Зоны чаепития",
            "Управление зонами чаепития.",
            new[]
            {
                new PermissionDefinition("tea-zones.view", "Просмотр", "Просматривать зоны чаепития."),
                new PermissionDefinition("tea-zones.edit", "Редактирование", "Создавать и изменять зоны чаепития."),
                new PermissionDefinition("tea-zones.delete", "Удаление", "Удалять зоны чаепития.")
            }),
        new PermissionGroupDefinition(
            "gallery",
            "Галерея",
            "Управление изображениями.",
            new[]
            {
                new PermissionDefinition("gallery.view", "Просмотр", "Просматривать изображения."),
                new PermissionDefinition("gallery.edit", "Редактирование", "Загружать и изменять изображения."),
                new PermissionDefinition("gallery.delete", "Удаление", "Удалять изображения.")
            }),
        new PermissionGroupDefinition(
            "promo-codes",
            "Промокоды",
            "Управление промокодами.",
            new[]
            {
                new PermissionDefinition("promo-codes.view", "Просмотр", "Просматривать промокоды."),
                new PermissionDefinition("promo-codes.edit", "Редактирование", "Создавать и изменять промокоды."),
                new PermissionDefinition("promo-codes.delete", "Удаление", "Удалять промокоды.")
            }),
        new PermissionGroupDefinition(
            "users",
            "Пользователи",
            "Управление пользователями админ-панели.",
            new[]
            {
                new PermissionDefinition("users.view", "Просмотр", "Просматривать список пользователей."),
                new PermissionDefinition("users.edit", "Редактирование", "Создавать и изменять пользователей."),
                new PermissionDefinition("users.delete", "Удаление", "Удалять пользователей.")
            }),
        new PermissionGroupDefinition(
            "blacklist",
            "Черный список",
            "Управление черным списком контактов.",
            new[]
            {
                new PermissionDefinition("blacklist.view", "Просмотр", "Просматривать черный список."),
                new PermissionDefinition("blacklist.edit", "Редактирование", "Добавлять и изменять записи черного списка."),
                new PermissionDefinition("blacklist.delete", "Удаление", "Удалять записи черного списка.")
            }),
        new PermissionGroupDefinition(
            "settings",
            "Настройки",
            "Системные настройки проекта.",
            new[]
            {
                new PermissionDefinition("settings.view", "Просмотр", "Просматривать настройки."),
                new PermissionDefinition("settings.edit", "Редактирование", "Изменять настройки.")
            })
    };

    public static IReadOnlyList<RoleSeedDefinition> DefaultRoles => new[]
    {
        new RoleSeedDefinition(
            "owner",
            "Владелец",
            "Полный доступ ко всем разделам и настройкам системы.",
            Groups.SelectMany(group => group.Permissions.Select(permission => permission.Id)).ToList(),
            true),
        new RoleSeedDefinition(
            "admin",
            "Администратор",
            "Полный доступ ко всем разделам админ-панели.",
            Groups.SelectMany(group => group.Permissions.Select(permission => permission.Id)).ToList(),
            true),
        new RoleSeedDefinition(
            "manager",
            "Менеджер",
            "Обрабатывает бронирования, сертификаты и отзывы.",
            new[]
            {
                "bookings.view",
                "bookings.edit",
                "bookings.confirm",
                "bookings.import",
                "blacklist.view",
                "blacklist.edit",
                "certificates.view",
                "certificates.edit",
                "certificate-orders.view",
                "certificate-orders.edit",
                "reviews.view",
                "reviews.edit"
            },
            true),
        new RoleSeedDefinition(
            "editor",
            "Редактор",
            "Обновляет контент, акции и справочные разделы.",
            new[]
            {
                "quests.view",
                "quests.edit",
                "extra-services.view",
                "extra-services.edit",
                "rules.view",
                "rules.edit",
                "about.view",
                "about.edit",
                "promotions.view",
                "promotions.edit",
                "promo-codes.view",
                "promo-codes.edit",
                "gallery.view",
                "gallery.edit"
            },
            true),
        new RoleSeedDefinition(
            "support",
            "Поддержка",
            "Просмотр бронирований и помощь клиентам.",
            new[]
            {
                "bookings.view",
                "blacklist.view",
                "certificates.view",
                "certificate-orders.view",
                "reviews.view"
            },
            true),
        new RoleSeedDefinition(
            "viewer",
            "Наблюдатель",
            "Просмотр разделов без возможности изменений.",
            Groups.SelectMany(group => group.Permissions.Select(permission => permission.Id))
                .Where(permission => permission.EndsWith(".view"))
                .ToList(),
            true)
    };
}
