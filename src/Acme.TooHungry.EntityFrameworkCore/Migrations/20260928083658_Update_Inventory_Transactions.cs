using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Update_Inventory_Transactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "DeleterId",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "DeletionTime",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "ExtraProperties",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "LastModificationTime",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "ReceivedDate",
                table: "AppInventoryBatches");

            migrationBuilder.RenameColumn(
                name: "LastModifierId",
                table: "AppInventoryTransactions",
                newName: "InventoryBatchId");

            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "AppInventoryBatches",
                newName: "RemainingQuantity");

            migrationBuilder.AddColumn<string>(
                name: "ReferenceDocument",
                table: "AppInventoryTransactions",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "ExpiryDate",
                table: "AppInventoryBatches",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BatchNumber",
                table: "AppInventoryBatches",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AddColumn<decimal>(
                name: "ConversionFactor",
                table: "AppInventoryBatches",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InitialQuantity",
                table: "AppInventoryBatches",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ManufactureDate",
                table: "AppInventoryBatches",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseUnit",
                table: "AppInventoryBatches",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "AppInventoryBatches",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "SupplierId",
                table: "AppInventoryBatches",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppInventoryTransactions_InventoryBatchId",
                table: "AppInventoryTransactions",
                column: "InventoryBatchId");

            migrationBuilder.AddForeignKey(
                name: "FK_AppInventoryTransactions_AppInventoryBatches_InventoryBatchId",
                table: "AppInventoryTransactions",
                column: "InventoryBatchId",
                principalTable: "AppInventoryBatches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppInventoryTransactions_AppInventoryBatches_InventoryBatchId",
                table: "AppInventoryTransactions");

            migrationBuilder.DropIndex(
                name: "IX_AppInventoryTransactions_InventoryBatchId",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "ReferenceDocument",
                table: "AppInventoryTransactions");

            migrationBuilder.DropColumn(
                name: "ConversionFactor",
                table: "AppInventoryBatches");

            migrationBuilder.DropColumn(
                name: "InitialQuantity",
                table: "AppInventoryBatches");

            migrationBuilder.DropColumn(
                name: "ManufactureDate",
                table: "AppInventoryBatches");

            migrationBuilder.DropColumn(
                name: "PurchaseUnit",
                table: "AppInventoryBatches");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "AppInventoryBatches");

            migrationBuilder.DropColumn(
                name: "SupplierId",
                table: "AppInventoryBatches");

            migrationBuilder.RenameColumn(
                name: "InventoryBatchId",
                table: "AppInventoryTransactions",
                newName: "LastModifierId");

            migrationBuilder.RenameColumn(
                name: "RemainingQuantity",
                table: "AppInventoryBatches",
                newName: "Quantity");

            migrationBuilder.AddColumn<string>(
                name: "ConcurrencyStamp",
                table: "AppInventoryTransactions",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "DeleterId",
                table: "AppInventoryTransactions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletionTime",
                table: "AppInventoryTransactions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExtraProperties",
                table: "AppInventoryTransactions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "AppInventoryTransactions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastModificationTime",
                table: "AppInventoryTransactions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "ExpiryDate",
                table: "AppInventoryBatches",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<string>(
                name: "BatchNumber",
                table: "AppInventoryBatches",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReceivedDate",
                table: "AppInventoryBatches",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }
    }
}
