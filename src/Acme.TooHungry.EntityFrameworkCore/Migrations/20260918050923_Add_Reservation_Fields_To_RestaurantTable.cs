using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_Reservation_Fields_To_RestaurantTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReservedCustomerName",
                table: "AppTables",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReservedCustomerPhone",
                table: "AppTables",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReservedGuestCount",
                table: "AppTables",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReservedNote",
                table: "AppTables",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReservedTime",
                table: "AppTables",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReservedCustomerName",
                table: "AppTables");

            migrationBuilder.DropColumn(
                name: "ReservedCustomerPhone",
                table: "AppTables");

            migrationBuilder.DropColumn(
                name: "ReservedGuestCount",
                table: "AppTables");

            migrationBuilder.DropColumn(
                name: "ReservedNote",
                table: "AppTables");

            migrationBuilder.DropColumn(
                name: "ReservedTime",
                table: "AppTables");
        }
    }
}
