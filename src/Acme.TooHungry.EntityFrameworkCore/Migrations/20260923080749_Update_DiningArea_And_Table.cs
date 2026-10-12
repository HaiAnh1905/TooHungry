using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Update_DiningArea_And_Table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AppDiningAreas",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppTables_Name",
                table: "AppTables",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppTables_Name",
                table: "AppTables");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AppDiningAreas");
        }
    }
}
