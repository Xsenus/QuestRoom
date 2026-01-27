using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    [Migration("20260215130000_AddPromoCodesAndSettings")]
    public partial class AddPromoCodesAndSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "difficulty_max",
                table: "quests",
                type: "integer",
                nullable: false,
                defaultValue: 5);

            migrationBuilder.AddColumn<string>(
                name: "payment_type",
                table: "bookings",
                type: "text",
                nullable: false,
                defaultValue: "card");

            migrationBuilder.AddColumn<Guid>(
                name: "promo_code_id",
                table: "bookings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "promo_code",
                table: "bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "promo_discount_type",
                table: "bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "promo_discount_value",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "promo_discount_amount",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "delivery_type",
                table: "certificate_orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vk_icon_url",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vk_icon_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "vk_icon_background",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "youtube_icon_url",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "youtube_icon_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "youtube_icon_background",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "instagram_icon_url",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "instagram_icon_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "instagram_icon_background",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "telegram_icon_url",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "telegram_icon_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "telegram_icon_background",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "gift_game_label",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "gift_game_url",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "certificate_page_title",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "certificate_page_description",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "certificate_page_pricing",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reviews_mode",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reviews_flamp_embed",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "booking_days_ahead",
                table: "settings",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.CreateTable(
                name: "promo_codes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    discount_type = table.Column<string>(type: "text", nullable: false),
                    discount_value = table.Column<int>(type: "integer", nullable: false),
                    valid_from = table.Column<DateOnly>(type: "date", nullable: false),
                    valid_until = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_promo_codes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "production_calendar_days",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    title = table.Column<string>(type: "text", nullable: true),
                    is_holiday = table.Column<bool>(type: "boolean", nullable: false),
                    source = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_production_calendar_days", x => x.id);
                });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "promo_codes");

            migrationBuilder.DropTable(
                name: "production_calendar_days");

            migrationBuilder.DropColumn(
                name: "difficulty_max",
                table: "quests");

            migrationBuilder.DropColumn(
                name: "payment_type",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "promo_code_id",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "promo_code",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "promo_discount_type",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "promo_discount_value",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "promo_discount_amount",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "delivery_type",
                table: "certificate_orders");

            migrationBuilder.DropColumn(
                name: "vk_icon_url",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "vk_icon_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "vk_icon_background",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "youtube_icon_url",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "youtube_icon_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "youtube_icon_background",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "instagram_icon_url",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "instagram_icon_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "instagram_icon_background",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "telegram_icon_url",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "telegram_icon_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "telegram_icon_background",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "gift_game_label",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "gift_game_url",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "certificate_page_title",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "certificate_page_description",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "certificate_page_pricing",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "reviews_mode",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "reviews_flamp_embed",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_days_ahead",
                table: "settings");
        }
    }
}
