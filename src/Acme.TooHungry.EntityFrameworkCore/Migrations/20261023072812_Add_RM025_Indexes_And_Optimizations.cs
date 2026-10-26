using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_RM025_Indexes_And_Optimizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppRecipes_DishId_IsActive",
                table: "AppRecipes");

            migrationBuilder.CreateIndex(
                name: "IX_AppRecipes_DishId_IsActive_Unique_Active",
                table: "AppRecipes",
                columns: new[] { "DishId", "IsActive" },
                unique: true,
                filter: "[DishId] IS NOT NULL AND [IsActive] = 1 AND [IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppOrders_OrderNumber",
                table: "AppOrders",
                column: "OrderNumber",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_AppOrders_Status_OrderDate",
                table: "AppOrders",
                columns: new[] { "Status", "OrderDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppRecipes_DishId_IsActive_Unique_Active",
                table: "AppRecipes");

            migrationBuilder.DropIndex(
                name: "IX_AppOrders_OrderNumber",
                table: "AppOrders");

            migrationBuilder.DropIndex(
                name: "IX_AppOrders_Status_OrderDate",
                table: "AppOrders");

            migrationBuilder.CreateIndex(
                name: "IX_AppRecipes_DishId_IsActive",
                table: "AppRecipes",
                columns: new[] { "DishId", "IsActive" });
        }
    }
}
