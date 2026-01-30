using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSettingsScheduleBackground : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "schedule_background",
                table: "settings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "schedule_background",
                table: "settings");
        }
    }
}
