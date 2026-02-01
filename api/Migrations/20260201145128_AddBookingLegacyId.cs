using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingLegacyId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "legacy_id",
                table: "bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_legacy_id",
                table: "bookings",
                column: "legacy_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bookings_legacy_id",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "legacy_id",
                table: "bookings");
        }
    }
}
