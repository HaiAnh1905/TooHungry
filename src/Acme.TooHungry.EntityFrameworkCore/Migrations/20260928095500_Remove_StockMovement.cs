using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Remove_StockMovement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppStockMovements");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppStockMovements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IngredientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuantityChange = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false)
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
    }
}
