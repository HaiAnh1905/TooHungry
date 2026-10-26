using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_Hardened_Filtered_Indexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppUnits_Abbreviation",
                table: "AppUnits");

            migrationBuilder.DropIndex(
                name: "IX_AppUnits_Name",
                table: "AppUnits");

            migrationBuilder.DropIndex(
                name: "IX_AppTables_Name",
                table: "AppTables");

            migrationBuilder.DropIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders");

            migrationBuilder.CreateIndex(
                name: "IX_AppUnits_Abbreviation",
                table: "AppUnits",
                column: "Abbreviation",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppUnits_Name",
                table: "AppUnits",
                column: "Name",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppTables_Name",
                table: "AppTables",
                column: "Name",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders",
                column: "TableId",
                unique: true,
                filter: "[TableId] IS NOT NULL AND [Status] <> 2 AND [Status] <> 3 AND [IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppUnits_Abbreviation",
                table: "AppUnits");

            migrationBuilder.DropIndex(
                name: "IX_AppUnits_Name",
                table: "AppUnits");

            migrationBuilder.DropIndex(
                name: "IX_AppTables_Name",
                table: "AppTables");

            migrationBuilder.DropIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders");

            migrationBuilder.CreateIndex(
                name: "IX_AppUnits_Abbreviation",
                table: "AppUnits",
                column: "Abbreviation",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUnits_Name",
                table: "AppUnits",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppTables_Name",
                table: "AppTables",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders",
                column: "TableId",
                unique: true,
                filter: "[TableId] IS NOT NULL AND [Status] = 0 AND [IsDeleted] = 0");
        }
    }
}
