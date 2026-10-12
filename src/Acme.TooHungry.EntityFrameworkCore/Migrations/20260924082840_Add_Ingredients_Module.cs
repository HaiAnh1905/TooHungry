using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_Ingredients_Module : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppIngredients_AppIngredientCategories_IngredientCategoryId",
                table: "AppIngredients");

            migrationBuilder.DropForeignKey(
                name: "FK_AppIngredients_AppUnits_UnitId",
                table: "AppIngredients");

            migrationBuilder.RenameColumn(
                name: "UnitId",
                table: "AppIngredients",
                newName: "PurchaseUnitId");

            migrationBuilder.RenameColumn(
                name: "IngredientCategoryId",
                table: "AppIngredients",
                newName: "CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_AppIngredients_UnitId",
                table: "AppIngredients",
                newName: "IX_AppIngredients_PurchaseUnitId");

            migrationBuilder.RenameIndex(
                name: "IX_AppIngredients_IngredientCategoryId",
                table: "AppIngredients",
                newName: "IX_AppIngredients_CategoryId");

            migrationBuilder.AlterColumn<string>(
                name: "Abbreviation",
                table: "AppUnits",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(16)",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UsageUnitId",
                table: "AppIngredients",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.Sql("UPDATE AppIngredients SET UsageUnitId = PurchaseUnitId");

            migrationBuilder.AlterColumn<Guid>(
                name: "UsageUnitId",
                table: "AppIngredients",
                type: "uniqueidentifier",
                nullable: false);

            migrationBuilder.AddColumn<decimal>(
                name: "ConversionFactor",
                table: "AppIngredients",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "AppIngredients",
                type: "bit",
                nullable: false,
                defaultValue: true);

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
                name: "IX_AppIngredients_UsageUnitId",
                table: "AppIngredients",
                column: "UsageUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredients_Name",
                table: "AppIngredients",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredientCategories_Name",
                table: "AppIngredientCategories",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AppIngredients_AppIngredientCategories_CategoryId",
                table: "AppIngredients",
                column: "CategoryId",
                principalTable: "AppIngredientCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AppIngredients_AppUnits_PurchaseUnitId",
                table: "AppIngredients",
                column: "PurchaseUnitId",
                principalTable: "AppUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AppIngredients_AppUnits_UsageUnitId",
                table: "AppIngredients",
                column: "UsageUnitId",
                principalTable: "AppUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppIngredients_AppIngredientCategories_CategoryId",
                table: "AppIngredients");

            migrationBuilder.DropForeignKey(
                name: "FK_AppIngredients_AppUnits_PurchaseUnitId",
                table: "AppIngredients");

            migrationBuilder.DropForeignKey(
                name: "FK_AppIngredients_AppUnits_UsageUnitId",
                table: "AppIngredients");

            migrationBuilder.DropIndex(
                name: "IX_AppUnits_Abbreviation",
                table: "AppUnits");

            migrationBuilder.DropIndex(
                name: "IX_AppUnits_Name",
                table: "AppUnits");

            migrationBuilder.DropIndex(
                name: "IX_AppIngredients_CategoryId",
                table: "AppIngredients");

            migrationBuilder.DropIndex(
                name: "IX_AppIngredients_Name",
                table: "AppIngredients");

            migrationBuilder.DropIndex(
                name: "IX_AppIngredientCategories_Name",
                table: "AppIngredientCategories");

            migrationBuilder.DropColumn(
                name: "UsageUnitId",
                table: "AppIngredients");

            migrationBuilder.DropColumn(
                name: "ConversionFactor",
                table: "AppIngredients");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "AppIngredients");

            migrationBuilder.RenameColumn(
                name: "PurchaseUnitId",
                table: "AppIngredients",
                newName: "UnitId");

            migrationBuilder.RenameColumn(
                name: "CategoryId",
                table: "AppIngredients",
                newName: "IngredientCategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_AppIngredients_PurchaseUnitId",
                table: "AppIngredients",
                newName: "IX_AppIngredients_UnitId");

            migrationBuilder.RenameIndex(
                name: "IX_AppIngredients_CategoryId",
                table: "AppIngredients",
                newName: "IX_AppIngredients_IngredientCategoryId");

            migrationBuilder.AlterColumn<string>(
                name: "Abbreviation",
                table: "AppUnits",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32);

            migrationBuilder.AddForeignKey(
                name: "FK_AppIngredients_AppIngredientCategories_IngredientCategoryId",
                table: "AppIngredients",
                column: "IngredientCategoryId",
                principalTable: "AppIngredientCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AppIngredients_AppUnits_UnitId",
                table: "AppIngredients",
                column: "UnitId",
                principalTable: "AppUnits",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
