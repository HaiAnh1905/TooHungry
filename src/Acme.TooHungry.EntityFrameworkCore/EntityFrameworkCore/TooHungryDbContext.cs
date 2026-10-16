using Microsoft.EntityFrameworkCore;
using Volo.Abp.AuditLogging.EntityFrameworkCore;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.DailyMenus;
using Acme.TooHungry.Units;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Forecasts;
using Acme.TooHungry.Tables;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Reservations;
using Acme.TooHungry.Ingredients;
using Acme.TooHungry.Recipes;
using Acme.TooHungry.Inventories;
using Volo.Abp.BackgroundJobs.EntityFrameworkCore;
using Volo.Abp.BlobStoring.Database.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore.Modeling;
using Volo.Abp.FeatureManagement.EntityFrameworkCore;
using Volo.Abp.Identity;
using Volo.Abp.Identity.EntityFrameworkCore;
using Volo.Abp.PermissionManagement.EntityFrameworkCore;
using Volo.Abp.SettingManagement.EntityFrameworkCore;
using Volo.Abp.OpenIddict.EntityFrameworkCore;
using Volo.Abp.TenantManagement;
using Volo.Abp.TenantManagement.EntityFrameworkCore;

namespace Acme.TooHungry.EntityFrameworkCore;

[ReplaceDbContext(typeof(IIdentityDbContext))]
[ReplaceDbContext(typeof(ITenantManagementDbContext))]
[ConnectionStringName("Default")]
public class TooHungryDbContext :
    AbpDbContext<TooHungryDbContext>,
    ITenantManagementDbContext,
    IIdentityDbContext
{
    /* Add DbSet properties for your Aggregate Roots / Entities here. */

    // Dishes
    public DbSet<DishCategory> DishCategories { get; set; }
    public DbSet<Dish> Dishes { get; set; }

    // Daily Menus
    public DbSet<DailyMenu> DailyMenus { get; set; }
    public DbSet<DailyMenuItem> DailyMenuItems { get; set; }

    // Units
    public DbSet<Unit> Units { get; set; }

    // Orders & Tables & Areas
    public DbSet<DiningArea> DiningAreas { get; set; }
    public DbSet<RestaurantTable> Tables { get; set; }
    public DbSet<TableReservation> TableReservations { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }

    // Demand Forecast & Ingredient Plan
    public DbSet<DemandForecast> DemandForecasts { get; set; }
    public DbSet<DemandForecastItem> DemandForecastItems { get; set; }
    public DbSet<IngredientPlan> IngredientPlans { get; set; }
    public DbSet<IngredientPlanItem> IngredientPlanItems { get; set; }

    // Ingredients, Recipes & Inventories
    public DbSet<Ingredient> Ingredients { get; set; }
    public DbSet<Recipe> Recipes { get; set; }
    public DbSet<RecipeIngredient> RecipeIngredients { get; set; }
    public DbSet<InventoryBatch> InventoryBatches { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }

    #region Entities from the modules

    // Identity
    public DbSet<IdentityUser> Users { get; set; }
    public DbSet<IdentityRole> Roles { get; set; }
    public DbSet<IdentityClaimType> ClaimTypes { get; set; }
    public DbSet<OrganizationUnit> OrganizationUnits { get; set; }
    public DbSet<IdentitySecurityLog> SecurityLogs { get; set; }
    public DbSet<IdentityLinkUser> LinkUsers { get; set; }
    public DbSet<IdentityUserDelegation> UserDelegations { get; set; }
    public DbSet<IdentitySession> Sessions { get; set; }

    // Tenant Management
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantConnectionString> TenantConnectionStrings { get; set; }

    #endregion

    public TooHungryDbContext(DbContextOptions<TooHungryDbContext> options)
        : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        /* Include modules to your migration db context */

        builder.ConfigurePermissionManagement();
        builder.ConfigureSettingManagement();
        builder.ConfigureBackgroundJobs();
        builder.ConfigureAuditLogging();
        builder.ConfigureFeatureManagement();
        builder.ConfigureIdentity();
        builder.ConfigureOpenIddict();
        builder.ConfigureTenantManagement();
        builder.ConfigureBlobStoring();

        /* Configure Restaurant Management Tables */

        // DishCategory
        builder.Entity<DishCategory>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "DishCategories", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.Property(x => x.DisplayOrder).HasDefaultValue(0);
            b.HasIndex(x => x.Name);
            b.HasMany(x => x.Dishes).WithOne(x => x.DishCategory).HasForeignKey(x => x.DishCategoryId).OnDelete(DeleteBehavior.SetNull);
        });

        // Dish
        builder.Entity<Dish>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "Dishes", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.Property(x => x.Price).HasPrecision(18, 2);
            b.Property(x => x.ImageUrl).HasMaxLength(1024);
            b.Property(x => x.DeletionReason).HasMaxLength(256);
            b.HasIndex(x => x.Name);
            b.Navigation(x => x.DishCategory).AutoInclude();
        });

        // DailyMenu (1 - N with DailyMenuItem)
        builder.Entity<DailyMenu>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "DailyMenus", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).HasMaxLength(128);
            b.Property(x => x.Note).HasMaxLength(512);
            b.HasMany(x => x.Items).WithOne(x => x.DailyMenu).HasForeignKey(x => x.DailyMenuId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Items).AutoInclude();
        });

        // DailyMenuItem (N - 1 with DailyMenu, N - 1 with Dish)
        builder.Entity<DailyMenuItem>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "DailyMenuItems", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Note).HasMaxLength(256);
            b.HasOne(x => x.Dish).WithMany(x => x.DailyMenuItems).HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Restrict);
            b.Navigation(x => x.Dish).AutoInclude();
        });

        // Unit
        builder.Entity<Unit>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "Units", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(64);
            b.HasIndex(x => x.Name).IsUnique();
            b.Property(x => x.Abbreviation).IsRequired().HasMaxLength(32);
            b.HasIndex(x => x.Abbreviation).IsUnique();
        });

        // DiningArea
        builder.Entity<DiningArea>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "DiningAreas", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.Property(x => x.IsActive).IsRequired().HasDefaultValue(true);
            b.HasMany(x => x.Tables).WithOne(x => x.DiningArea).HasForeignKey(x => x.DiningAreaId).OnDelete(DeleteBehavior.SetNull);
        });

        // RestaurantTable
        builder.Entity<RestaurantTable>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "Tables", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.HasIndex(x => x.Name).IsUnique();
            b.Property(x => x.Location).HasMaxLength(128);
            b.Property(x => x.ReservedCustomerName).HasMaxLength(128);
            b.Property(x => x.ReservedCustomerPhone).HasMaxLength(32);
            b.Property(x => x.ReservedNote).HasMaxLength(512);
            b.Property(x => x.OccupiedTime);
            b.HasOne(x => x.DiningArea).WithMany(x => x.Tables).HasForeignKey(x => x.DiningAreaId).OnDelete(DeleteBehavior.SetNull);
            b.HasMany(x => x.Orders).WithOne(x => x.Table).HasForeignKey(x => x.TableId).OnDelete(DeleteBehavior.SetNull);
            b.HasMany(x => x.Reservations).WithOne(x => x.Table).HasForeignKey(x => x.TableId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.DiningArea).AutoInclude();
        });

        // TableReservation
        builder.Entity<TableReservation>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "TableReservations", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.CustomerName).IsRequired().HasMaxLength(128);
            b.Property(x => x.CustomerPhone).IsRequired().HasMaxLength(20);
            b.Property(x => x.Note).HasMaxLength(512);
            b.Property(x => x.GuestCount).IsRequired();
            b.Property(x => x.ReservationTime).IsRequired();
            b.Property(x => x.Status).IsRequired();
            b.HasOne(x => x.Table).WithMany(x => x.Reservations).HasForeignKey(x => x.TableId).OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(x => new { x.Status, x.ReservationTime });
            b.HasIndex(x => new { x.TableId, x.Status });
        });

        // Order
        builder.Entity<Order>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "Orders", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.OrderNumber).IsRequired().HasMaxLength(64);
            b.Property(x => x.TotalAmount).HasPrecision(18, 2);
            b.Property(x => x.Note).HasMaxLength(512);
            b.HasOne(x => x.Table).WithMany(x => x.Orders).HasForeignKey(x => x.TableId).OnDelete(DeleteBehavior.SetNull);
            b.HasMany(x => x.Items).WithOne(x => x.Order).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Items).AutoInclude();
            b.Navigation(x => x.Table).AutoInclude();
            b.HasIndex(x => x.TableId)
                .IsUnique()
                .HasFilter("[TableId] IS NOT NULL AND [Status] = 0 AND [IsDeleted] = 0");
        });

        // OrderItem (M - 1 Order, 1 - 1 / M - 1 Dish)
        builder.Entity<OrderItem>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "OrderItems", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.TotalPrice).HasPrecision(18, 2);
            b.Property(x => x.Note).HasMaxLength(256);
            b.HasOne(x => x.Dish).WithMany().HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Restrict);
            b.Navigation(x => x.Dish).AutoInclude();
        });

        // DemandForecast
        builder.Entity<DemandForecast>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "DemandForecasts", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Note).HasMaxLength(512);
            b.HasMany(x => x.Items).WithOne(x => x.DemandForecast).HasForeignKey(x => x.DemandForecastId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Items).AutoInclude();
        });

        // DemandForecastItem
        builder.Entity<DemandForecastItem>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "DemandForecastItems", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Note).HasMaxLength(256);
            b.HasOne(x => x.Dish).WithMany().HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Restrict);
            b.Navigation(x => x.Dish).AutoInclude();
        });

        // IngredientPlan
        builder.Entity<IngredientPlan>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "IngredientPlans", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Note).HasMaxLength(512);
            b.Property(x => x.Status).IsRequired();
            b.HasOne(x => x.DemandForecast).WithOne().HasForeignKey<IngredientPlan>(x => x.DemandForecastId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Items).WithOne(x => x.IngredientPlan).HasForeignKey(x => x.IngredientPlanId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Items).AutoInclude();
        });

        // IngredientPlanItem
        builder.Entity<IngredientPlanItem>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "IngredientPlanItems", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.RequiredQuantity).HasPrecision(18, 4);
            b.Property(x => x.Note).HasMaxLength(256);
            b.HasOne(x => x.Ingredient).WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
            b.Navigation(x => x.Ingredient).AutoInclude();
        });

        // Ingredient
        builder.Entity<Ingredient>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "Ingredients", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.BaseUnit).IsRequired().HasMaxLength(32);
            b.Property(x => x.MinStock).HasPrecision(18, 4);
            b.Property(x => x.EstimatedPrice).HasPrecision(18, 2);
            b.Property(x => x.DeactivationReason).HasMaxLength(500);
            b.HasIndex(x => x.Name);
            b.HasIndex(x => x.IsActive);
        });

        // Recipe
        builder.Entity<Recipe>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "Recipes", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Name).IsRequired().HasMaxLength(128);
            b.Property(x => x.Description).HasMaxLength(512);
            b.Property(x => x.DeactivationReason).HasMaxLength(500);
            b.HasOne(x => x.Dish).WithMany().HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Restrict);
            b.HasMany(x => x.Ingredients).WithOne(x => x.Recipe).HasForeignKey(x => x.RecipeId).OnDelete(DeleteBehavior.Cascade);
            b.Navigation(x => x.Ingredients).AutoInclude();
            b.HasIndex(x => new { x.DishId, x.IsActive });
        });

        // RecipeIngredient
        builder.Entity<RecipeIngredient>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "RecipeIngredients", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.Unit).IsRequired().HasMaxLength(64);
            b.Property(x => x.ConversionFactor).HasPrecision(18, 6);
            b.HasOne(x => x.Ingredient).WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
            b.Navigation(x => x.Ingredient).AutoInclude();
        });

        // InventoryBatch
        builder.Entity<InventoryBatch>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "InventoryBatches", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.BatchCode).IsRequired().HasMaxLength(64);
            b.Property(x => x.PurchaseUnit).IsRequired().HasMaxLength(32);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.RemainingQuantity).HasPrecision(18, 4);
            b.Property(x => x.ConversionFactor).HasPrecision(18, 4);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.DeactivationReason).HasMaxLength(500);
            b.HasOne(x => x.Ingredient).WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
            b.Navigation(x => x.Ingredient).AutoInclude();
            b.HasIndex(x => new { x.IngredientId, x.IsActive, x.RemainingQuantity, x.ExpiryDate });
        });

        // InventoryTransaction
        builder.Entity<InventoryTransaction>(b =>
        {
            b.ToTable(TooHungryConsts.DbTablePrefix + "InventoryTransactions", TooHungryConsts.DbSchema);
            b.ConfigureByConvention();
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.Reason).IsRequired().HasMaxLength(500);
            b.Property(x => x.ReferenceId).HasMaxLength(128);
            b.HasOne(x => x.Ingredient).WithMany().HasForeignKey(x => x.IngredientId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Batch).WithMany().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.SetNull);
            b.Navigation(x => x.Ingredient).AutoInclude();
            b.HasIndex(x => new { x.IngredientId, x.CreationTime });
        });
    }
}
