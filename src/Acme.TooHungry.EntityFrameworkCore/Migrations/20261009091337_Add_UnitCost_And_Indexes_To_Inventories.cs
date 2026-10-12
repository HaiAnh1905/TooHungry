using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_UnitCost_And_Indexes_To_Inventories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders");

            migrationBuilder.DropIndex(
                name: "IX_AppInventoryBatches_IngredientId_RemainingQuantity_ExpiryDate",
                table: "AppInventoryBatches");

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "AppInventoryTransactions",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders",
                column: "TableId",
                unique: true,
                filter: "[TableId] IS NOT NULL AND [Status] = 0 AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppInventoryBatches_IngredientId_IsActive_RemainingQuantity_ExpiryDate",
                table: "AppInventoryBatches",
                columns: new[] { "IngredientId", "IsActive", "RemainingQuantity", "ExpiryDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders");

            migrationBuilder.DropIndex(
                name: "IX_AppInventoryBatches_IngredientId_IsActive_RemainingQuantity_ExpiryDate",
                table: "AppInventoryBatches");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "AppInventoryTransactions");

            migrationBuilder.CreateIndex(
                name: "IX_AppOrders_TableId",
                table: "AppOrders",
                column: "TableId");

            migrationBuilder.CreateIndex(
                name: "IX_AppInventoryBatches_IngredientId_RemainingQuantity_ExpiryDate",
                table: "AppInventoryBatches",
                columns: new[] { "IngredientId", "RemainingQuantity", "ExpiryDate" });
        }
    }
}
