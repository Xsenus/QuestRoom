using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuestRoomApi.Data;

#nullable disable

namespace QuestRoomApi.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260221123000_AddMissingCertificatePageTitleColumn")]
    public partial class AddMissingCertificatePageTitleColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE settings
                ADD COLUMN IF NOT EXISTS certificate_page_title text;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE settings
                DROP COLUMN IF EXISTS certificate_page_title;
                """);
        }
    }
}
