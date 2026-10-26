using Acme.TooHungry.Security;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;

namespace Acme.TooHungry;

[DependsOn(
    typeof(TooHungryApplicationModule),
    typeof(TooHungryHttpApiModule),
    typeof(TooHungryDomainTestModule)
)]
public class TooHungryApplicationTestModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddTestAuthorization();
    }
}
