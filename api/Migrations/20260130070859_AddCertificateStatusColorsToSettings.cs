using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCertificateStatusColorsToSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "certificate_status_canceled_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "certificate_status_completed_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "certificate_status_pending_color",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "certificate_status_processed_color",
                table: "settings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "certificate_status_canceled_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "certificate_status_completed_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "certificate_status_pending_color",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "certificate_status_processed_color",
                table: "settings");
        }
    }
}
