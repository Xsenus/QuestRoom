using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUniqueBookingScheduleIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bookings_quest_schedule_id",
                table: "bookings");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_quest_schedule_id",
                table: "bookings",
                column: "quest_schedule_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_bookings_quest_schedule_id",
                table: "bookings");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_quest_schedule_id",
                table: "bookings",
                column: "quest_schedule_id",
                unique: true);
        }
    }
}
