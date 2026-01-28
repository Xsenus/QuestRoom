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
            "content",
            "Контент и страницы",
            "Управление публичным контентом сайта и статическими страницами.",
            new[]
            {
                new PermissionDefinition("content.read", "Просмотр контента", "Просматривать страницы, правила и информацию о проекте."),
                new PermissionDefinition("content.edit", "Редактирование контента", "Изменять страницы правил и информацию о проекте."),
                new PermissionDefinition("quests.manage", "Квесты", "Создание и обновление квестов, расписаний и стоимости."),
                new PermissionDefinition("promotions.manage", "Акции и промокоды", "Управление акциями и промокодами.")
            }),
        new PermissionGroupDefinition(
            "sales",
            "Продажи и бронирования",
            "Операции с бронированиями и сертификатами.",
            new[]
            {
                new PermissionDefinition("bookings.manage", "Бронирования", "Создание, изменение и подтверждение бронирований."),
                new PermissionDefinition("certificates.manage", "Сертификаты", "Управление сертификатами и заявками."),
                new PermissionDefinition("reviews.manage", "Отзывы", "Модерация отзывов клиентов.")
            }),
        new PermissionGroupDefinition(
            "system",
            "Системные настройки",
            "Пользователи, роли и настройки платформы.",
            new[]
            {
                new PermissionDefinition("users.manage", "Пользователи", "Добавление, блокировка и удаление пользователей."),
                new PermissionDefinition("roles.manage", "Роли и права", "Создание и редактирование ролей и правил доступа."),
                new PermissionDefinition("settings.manage", "Настройки", "Изменение системных настроек и уведомлений.")
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
            "Управляет контентом, продажами и правилами доступа.",
            new[]
            {
                "content.read",
                "content.edit",
                "quests.manage",
                "promotions.manage",
                "bookings.manage",
                "certificates.manage",
                "reviews.manage",
                "users.manage",
                "roles.manage",
                "settings.manage"
            },
            true),
        new RoleSeedDefinition(
            "manager",
            "Менеджер",
            "Обрабатывает бронирования, сертификаты и отзывы.",
            new[] { "bookings.manage", "certificates.manage", "reviews.manage", "content.read" },
            true),
        new RoleSeedDefinition(
            "editor",
            "Редактор",
            "Обновляет тексты и акции без доступа к настройкам.",
            new[] { "content.read", "content.edit", "quests.manage", "promotions.manage" },
            true),
        new RoleSeedDefinition(
            "support",
            "Поддержка",
            "Просмотр бронирований и помощь клиентам.",
            new[] { "bookings.manage", "certificates.manage", "content.read" },
            true),
        new RoleSeedDefinition(
            "viewer",
            "Наблюдатель",
            "Просмотр отчетов и списка бронирований без изменений.",
            new[] { "content.read" },
            true)
    };
}
