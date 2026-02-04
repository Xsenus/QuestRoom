using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddParentQuestIdToQuests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "parent_quest_id",
                table: "quests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_quests_parent_quest_id",
                table: "quests",
                column: "parent_quest_id");

            migrationBuilder.AddForeignKey(
                name: "FK_quests_quests_parent_quest_id",
                table: "quests",
                column: "parent_quest_id",
                principalTable: "quests",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quests_quests_parent_quest_id",
                table: "quests");

            migrationBuilder.DropIndex(
                name: "IX_quests_parent_quest_id",
                table: "quests");

            migrationBuilder.DropColumn(
                name: "parent_quest_id",
                table: "quests");
        }
    }
}
