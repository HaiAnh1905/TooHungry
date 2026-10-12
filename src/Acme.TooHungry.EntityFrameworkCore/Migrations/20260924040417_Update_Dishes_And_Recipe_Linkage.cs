using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Update_Dishes_And_Recipe_Linkage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<decimal>(
                name: "Price",
                table: "AppDishes",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AddColumn<string>(
                name: "DeletionReason",
                table: "AppDishes",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AppDishes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_AppDishes_Name",
                table: "AppDishes",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_AppDishCategories_Name",
                table: "AppDishCategories",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppDishes_Name",
                table: "AppDishes");

            migrationBuilder.DropIndex(
                name: "IX_AppDishCategories_Name",
                table: "AppDishCategories");

            migrationBuilder.DropColumn(
                name: "DeletionReason",
                table: "AppDishes");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AppDishes");

            migrationBuilder.AlterColumn<float>(
                name: "Price",
                table: "AppDishes",
                type: "real",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)",
                oldPrecision: 18,
                oldScale: 2);
        }
    }
}
