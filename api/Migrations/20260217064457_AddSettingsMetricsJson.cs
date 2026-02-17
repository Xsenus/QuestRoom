using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSettingsMetricsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "metrics_json",
                table: "settings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "metrics_json",
                table: "settings");
        }
    }
}
