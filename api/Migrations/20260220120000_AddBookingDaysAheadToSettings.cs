using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuestRoomApi.Data;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260220120000_AddBookingDaysAheadToSettings")]
    public partial class AddBookingDaysAheadToSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE settings
                ADD COLUMN IF NOT EXISTS booking_days_ahead integer NOT NULL DEFAULT 10;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE settings
                DROP COLUMN IF EXISTS booking_days_ahead;
                """);
        }
    }
}
