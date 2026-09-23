using Acme.TooHungry.EntityFrameworkCore;
using Volo.Abp.Autofac;
using Volo.Abp.Modularity;

namespace Acme.TooHungry.DbMigrator;

[DependsOn(
    typeof(AbpAutofacModule),
    typeof(TooHungryEntityFrameworkCoreModule),
    typeof(TooHungryApplicationContractsModule)
)]
public class TooHungryDbMigratorModule : AbpModule
{
}
