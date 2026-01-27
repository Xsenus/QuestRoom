using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuestRoomApi.Data;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260221120000_AddMissingSettingsAndQuestColumns")]
    public partial class AddMissingSettingsAndQuestColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE settings
                ADD COLUMN IF NOT EXISTS certificate_page_description text;

                ALTER TABLE quests
                ADD COLUMN IF NOT EXISTS difficulty_max integer NOT NULL DEFAULT 5;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE settings
                DROP COLUMN IF EXISTS certificate_page_description;

                ALTER TABLE quests
                DROP COLUMN IF EXISTS difficulty_max;
                """);
        }
    }
}
