using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Added_StockMovement_And_IsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AppUnits",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AppIngredientCategories",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "AppStockMovements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuantityChange = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppStockMovements", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppStockMovements_IngredientId",
                table: "AppStockMovements",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_AppStockMovements_ReferenceId",
                table: "AppStockMovements",
                column: "ReferenceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppStockMovements");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AppUnits");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AppIngredientCategories");
        }
    }
}
