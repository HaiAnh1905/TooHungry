using Volo.Abp.Modularity;

namespace Acme.TooHungry;

[DependsOn(
    typeof(TooHungryApplicationModule),
    typeof(TooHungryDomainTestModule)
)]
public class TooHungryApplicationTestModule : AbpModule
{

}
