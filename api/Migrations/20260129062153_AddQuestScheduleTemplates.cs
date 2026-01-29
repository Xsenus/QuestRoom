using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestScheduleTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "booking_cutoff_minutes",
                table: "settings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "time_zone",
                table: "settings",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "quest_schedule_overrides",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quest_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    is_closed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quest_schedule_overrides", x => x.id);
                    table.ForeignKey(
                        name: "FK_quest_schedule_overrides_quests_quest_id",
                        column: x => x.quest_id,
                        principalTable: "quests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quest_schedule_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quest_id = table.Column<Guid>(type: "uuid", nullable: false),
                    holiday_price = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quest_schedule_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_quest_schedule_settings_quests_quest_id",
                        column: x => x.quest_id,
                        principalTable: "quests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quest_weekly_slots",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    quest_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_of_week = table.Column<int>(type: "integer", nullable: false),
                    time_slot = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    price = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quest_weekly_slots", x => x.id);
                    table.ForeignKey(
                        name: "FK_quest_weekly_slots_quests_quest_id",
                        column: x => x.quest_id,
                        principalTable: "quests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "quest_schedule_override_slots",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    override_id = table.Column<Guid>(type: "uuid", nullable: false),
                    time_slot = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    price = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quest_schedule_override_slots", x => x.id);
                    table.ForeignKey(
                        name: "FK_quest_schedule_override_slots_quest_schedule_overrides_over~",
                        column: x => x.override_id,
                        principalTable: "quest_schedule_overrides",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quest_schedule_override_slots_override_id_time_slot",
                table: "quest_schedule_override_slots",
                columns: new[] { "override_id", "time_slot" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quest_schedule_overrides_quest_id_date",
                table: "quest_schedule_overrides",
                columns: new[] { "quest_id", "date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quest_schedule_settings_quest_id",
                table: "quest_schedule_settings",
                column: "quest_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_quest_weekly_slots_quest_id_day_of_week_time_slot",
                table: "quest_weekly_slots",
                columns: new[] { "quest_id", "day_of_week", "time_slot" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "quest_schedule_override_slots");

            migrationBuilder.DropTable(
                name: "quest_schedule_settings");

            migrationBuilder.DropTable(
                name: "quest_weekly_slots");

            migrationBuilder.DropTable(
                name: "quest_schedule_overrides");

            migrationBuilder.DropColumn(
                name: "booking_cutoff_minutes",
                table: "settings");

            migrationBuilder.DropColumn(
                name: "time_zone",
                table: "settings");
        }
    }
}
