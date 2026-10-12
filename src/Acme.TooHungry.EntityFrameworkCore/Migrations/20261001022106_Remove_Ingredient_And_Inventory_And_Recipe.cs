using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Acme.TooHungry.Migrations
{
    /// <inheritdoc />
    public partial class Remove_Ingredient_And_Inventory_And_Recipe : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppIngredientPlanItems");

            migrationBuilder.DropTable(
                name: "AppInventoryTransactions");

            migrationBuilder.DropTable(
                name: "AppRecipeIngredients");

            migrationBuilder.DropTable(
                name: "AppIngredientPlans");

            migrationBuilder.DropTable(
                name: "AppInventoryBatches");

            migrationBuilder.DropTable(
                name: "AppRecipes");

            migrationBuilder.DropTable(
                name: "AppInventories");

            migrationBuilder.DropTable(
                name: "AppIngredients");

            migrationBuilder.DropTable(
                name: "AppIngredientCategories");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppIngredientCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppIngredientCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppIngredientPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemandForecastId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    PlanDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppIngredientPlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppIngredientPlans_AppDemandForecasts_DemandForecastId",
                        column: x => x.DemandForecastId,
                        principalTable: "AppDemandForecasts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppRecipes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DishId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeactivationReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Instructions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRecipes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRecipes_AppDishes_DishId",
                        column: x => x.DishId,
                        principalTable: "AppDishes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppIngredients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PurchaseUnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UsageUnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ConversionFactor = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppIngredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppIngredients_AppIngredientCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "AppIngredientCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AppIngredients_AppUnits_PurchaseUnitId",
                        column: x => x.PurchaseUnitId,
                        principalTable: "AppUnits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AppIngredients_AppUnits_UsageUnitId",
                        column: x => x.UsageUnitId,
                        principalTable: "AppUnits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppIngredientPlanItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngredientPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    RequiredQuantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppIngredientPlanItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppIngredientPlanItems_AppIngredientPlans_IngredientPlanId",
                        column: x => x.IngredientPlanId,
                        principalTable: "AppIngredientPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppIngredientPlanItems_AppIngredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "AppIngredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AppInventories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CurrentStock = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    DeactivationReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MinimumStock = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppInventories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppInventories_AppIngredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "AppIngredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppRecipeIngredients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IngredientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRecipeIngredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRecipeIngredients_AppIngredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "AppIngredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AppRecipeIngredients_AppRecipes_RecipeId",
                        column: x => x.RecipeId,
                        principalTable: "AppRecipes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppInventoryBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InventoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ConversionFactor = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeleterId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DeletionTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExtraProperties = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    InitialQuantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    LastModificationTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastModifierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ManufactureDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PurchaseUnit = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    RemainingQuantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SupplierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppInventoryBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppInventoryBatches_AppInventories_InventoryId",
                        column: x => x.InventoryId,
                        principalTable: "AppInventories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AppInventoryTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InventoryBatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    InventoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreationTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    ReferenceDocument = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TransactionType = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppInventoryTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppInventoryTransactions_AppInventories_InventoryId",
                        column: x => x.InventoryId,
                        principalTable: "AppInventories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppInventoryTransactions_AppInventoryBatches_InventoryBatchId",
                        column: x => x.InventoryBatchId,
                        principalTable: "AppInventoryBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredientCategories_Name",
                table: "AppIngredientCategories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredientPlanItems_IngredientId",
                table: "AppIngredientPlanItems",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredientPlanItems_IngredientPlanId",
                table: "AppIngredientPlanItems",
                column: "IngredientPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredientPlans_DemandForecastId",
                table: "AppIngredientPlans",
                column: "DemandForecastId");

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredients_CategoryId",
                table: "AppIngredients",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredients_Name",
                table: "AppIngredients",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredients_PurchaseUnitId",
                table: "AppIngredients",
                column: "PurchaseUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_AppIngredients_UsageUnitId",
                table: "AppIngredients",
                column: "UsageUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_AppInventories_IngredientId",
                table: "AppInventories",
                column: "IngredientId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppInventoryBatches_InventoryId",
                table: "AppInventoryBatches",
                column: "InventoryId");

            migrationBuilder.CreateIndex(
                name: "IX_AppInventoryTransactions_InventoryBatchId",
                table: "AppInventoryTransactions",
                column: "InventoryBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_AppInventoryTransactions_InventoryId",
                table: "AppInventoryTransactions",
                column: "InventoryId");

            migrationBuilder.CreateIndex(
                name: "IX_AppRecipeIngredients_IngredientId",
                table: "AppRecipeIngredients",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_AppRecipeIngredients_RecipeId",
                table: "AppRecipeIngredients",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "IX_AppRecipes_DishId",
                table: "AppRecipes",
                column: "DishId",
                unique: true);
        }
    }
}
