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

            migrationBuilder.Sql("""
                WITH ranked AS (
                    SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
                    FROM bookings
                )
                UPDATE bookings b
                SET legacy_id = r.rn
                FROM ranked r
                WHERE b.id = r.id AND b.legacy_id IS NULL;
                """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bookings_legacy_id_seq') THEN
                        CREATE SEQUENCE bookings_legacy_id_seq START WITH 1 INCREMENT BY 1;
                    END IF;
                END $$;
                """);

            migrationBuilder.Sql("""
                SELECT setval('bookings_legacy_id_seq', COALESCE((SELECT MAX(legacy_id) FROM bookings), 0));
                ALTER TABLE bookings ALTER COLUMN legacy_id SET DEFAULT nextval('bookings_legacy_id_seq');
                ALTER TABLE bookings ALTER COLUMN legacy_id SET NOT NULL;
                """);

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

            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS bookings_legacy_id_seq;");
        }
    }
}
