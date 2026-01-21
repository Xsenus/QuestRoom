using Microsoft.EntityFrameworkCore.Migrations;

namespace QuestRoomApi.Migrations;

public partial class AddPromotionDisplayMode : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "display_mode",
            table: "promotions",
            type: "text",
            nullable: false,
            defaultValue: "text_description");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "display_mode",
            table: "promotions");
    }
}
