using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddHolidayPricingModeAndTemplateDay : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "holiday_pricing_mode",
                table: "quest_schedule_settings",
                type: "text",
                nullable: false,
                defaultValue: "fixed_price");

            migrationBuilder.AddColumn<int>(
                name: "holiday_template_day_of_week",
                table: "quest_schedule_settings",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "holiday_pricing_mode",
                table: "quest_schedule_settings");

            migrationBuilder.DropColumn(
                name: "holiday_template_day_of_week",
                table: "quest_schedule_settings");
        }
    }
}
