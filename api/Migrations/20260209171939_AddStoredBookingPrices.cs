using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddStoredBookingPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "extra_participant_price",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "quest_price",
                table: "bookings",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "extra_participant_price",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "quest_price",
                table: "bookings");
        }
    }
}
