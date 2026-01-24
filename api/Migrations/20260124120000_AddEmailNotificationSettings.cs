using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuestRoomApi.Data;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260124120000_AddEmailNotificationSettings")]
    public partial class AddEmailNotificationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "notification_email",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "smtp_host",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "smtp_port",
                table: "settings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "smtp_user",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "smtp_password",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "smtp_use_ssl",
                table: "settings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "smtp_from_email",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "smtp_from_name",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "notify_booking_admin",
                table: "settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "notify_booking_customer",
                table: "settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "notify_certificate_admin",
                table: "settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "notify_certificate_customer",
                table: "settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "notification_email",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_host",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_port",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_user",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_password",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_use_ssl",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_from_email",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "smtp_from_name",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "notify_booking_admin",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "notify_booking_customer",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "notify_certificate_admin",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "notify_certificate_customer",
                table: "settings");
        }
    }
}
