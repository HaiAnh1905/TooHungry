using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Add_TableReservations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppTableReservations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    CustomerPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ReservationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    GuestCount = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppTableReservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppTableReservations_AppTables_TableId",
                        column: x => x.TableId,
                        principalTable: "AppTables",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppTableReservations_Status_ReservationTime",
                table: "AppTableReservations",
                columns: new[] { "Status", "ReservationTime" });

            migrationBuilder.CreateIndex(
                name: "IX_AppTableReservations_TableId_Status",
                table: "AppTableReservations",
                columns: new[] { "TableId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppTableReservations");
        }
    }
}
