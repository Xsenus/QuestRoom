using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestGiftFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "gift_game_label",
                table: "quests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "gift_game_url",
                table: "quests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "video_url",
                table: "quests",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "gift_game_label",
                table: "quests");

            migrationBuilder.DropColumn(
                name: "gift_game_url",
                table: "quests");

            migrationBuilder.DropColumn(
                name: "video_url",
                table: "quests");
        }
    }
}
