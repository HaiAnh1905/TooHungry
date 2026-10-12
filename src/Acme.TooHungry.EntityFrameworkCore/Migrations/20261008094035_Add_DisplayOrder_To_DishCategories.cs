using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_DisplayOrder_To_DishCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "AppDishCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "AppDishCategories");
        }
    }
}
