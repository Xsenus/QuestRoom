using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMirKvestovApiSettingsToSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "mir_kvestov_md5_key",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mir_kvestov_prepay_md5_key",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "mir_kvestov_schedule_days_ahead",
                table: "settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "mir_kvestov_schedule_fields",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mir_kvestov_slot_id_format",
                table: "settings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "mir_kvestov_md5_key",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "mir_kvestov_prepay_md5_key",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "mir_kvestov_schedule_days_ahead",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "mir_kvestov_schedule_fields",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "mir_kvestov_slot_id_format",
                table: "settings");
        }
    }
}
