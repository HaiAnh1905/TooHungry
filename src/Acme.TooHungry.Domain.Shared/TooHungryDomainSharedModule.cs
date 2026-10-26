using Acme.TooHungry.Localization;
using Volo.Abp.AuditLogging;
using Volo.Abp.BackgroundJobs;
using Volo.Abp.FeatureManagement;
using Volo.Abp.Identity;
using Volo.Abp.Localization;
using Volo.Abp.Localization.ExceptionHandling;
using Volo.Abp.Validation.Localization;
using Volo.Abp.Modularity;
using Volo.Abp.PermissionManagement;
using Volo.Abp.SettingManagement;
using Volo.Abp.VirtualFileSystem;
using Volo.Abp.OpenIddict;
using Volo.Abp.BlobStoring.Database;
using Volo.Abp.TenantManagement;

namespace Acme.TooHungry;

[DependsOn(
    typeof(AbpAuditLoggingDomainSharedModule),
    typeof(AbpBackgroundJobsDomainSharedModule),
    typeof(AbpFeatureManagementDomainSharedModule),
    typeof(AbpPermissionManagementDomainSharedModule),
    typeof(AbpSettingManagementDomainSharedModule),
    typeof(AbpIdentityDomainSharedModule),
    typeof(AbpOpenIddictDomainSharedModule),
    typeof(AbpTenantManagementDomainSharedModule),
    typeof(BlobStoringDatabaseDomainSharedModule)
    )]
public class TooHungryDomainSharedModule : AbpModule
{
    public override void PreConfigureServices(ServiceConfigurationContext context)
    {
        TooHungryGlobalFeatureConfigurator.Configure();
        TooHungryModuleExtensionConfigurator.Configure();
    }

    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        Configure<AbpVirtualFileSystemOptions>(options =>
        {
            options.FileSets.AddEmbedded<TooHungryDomainSharedModule>();
        });

        Configure<AbpLocalizationOptions>(options =>
        {
            options.Resources
                .Add<TooHungryResource>("vi")
                .AddBaseTypes(typeof(AbpValidationResource))
                .AddVirtualJson("/Localization/TooHungry");

            options.DefaultResourceType = typeof(TooHungryResource);

            options.Languages.Clear();
            options.Languages.Add(new LanguageInfo("vi", "vi", "Tiếng Việt"));
            options.Languages.Add(new LanguageInfo("en", "en", "English"));
        });

        Configure<AbpExceptionLocalizationOptions>(options =>
        {
            options.MapCodeNamespace("TooHungry", typeof(TooHungryResource));
            options.MapCodeNamespace("InventoryBatch", typeof(TooHungryResource));
            options.MapCodeNamespace("Ingredient", typeof(TooHungryResource));
            options.MapCodeNamespace("Recipe", typeof(TooHungryResource));
            options.MapCodeNamespace("RecipeIngredient", typeof(TooHungryResource));
            options.MapCodeNamespace("StockAdjustment", typeof(TooHungryResource));
            options.MapCodeNamespace("Inventory", typeof(TooHungryResource));
        });
    }
}
