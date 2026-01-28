using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionDisplayFlagsAndPromotionsPerRow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "promotions_per_row",
                table: "settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "show_description",
                table: "promotions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "show_discount_text",
                table: "promotions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "show_image",
                table: "promotions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "show_period",
                table: "promotions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "show_title",
                table: "promotions",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "promotions_per_row",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "show_description",
                table: "promotions");

            migrationBuilder.DropColumn(
                name: "show_discount_text",
                table: "promotions");

            migrationBuilder.DropColumn(
                name: "show_image",
                table: "promotions");

            migrationBuilder.DropColumn(
                name: "show_period",
                table: "promotions");

            migrationBuilder.DropColumn(
                name: "show_title",
                table: "promotions");
        }
    }
}
