using Microsoft.EntityFrameworkCore.Migrations;

namespace QuestRoomApi.Migrations;

public partial class EnsurePromotionDisplayMode : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE promotions
            ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'text_description';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE promotions
            DROP COLUMN IF EXISTS display_mode;
            """);
    }
}
