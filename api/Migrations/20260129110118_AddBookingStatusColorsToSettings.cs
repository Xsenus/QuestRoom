using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingStatusColorsToSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "booking_status_cancelled_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_status_completed_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_status_confirmed_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_status_created_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_status_not_confirmed_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_status_pending_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_status_planned_color",
                table: "settings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "booking_status_cancelled_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_status_completed_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_status_confirmed_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_status_created_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_status_not_confirmed_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_status_pending_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "booking_status_planned_color",
                table: "settings");
        }
    }
}
