using Volo.Abp.Modularity;

namespace Acme.TooHungry;

[DependsOn(
    typeof(TooHungryDomainModule),
    typeof(TooHungryTestBaseModule)
)]
public class TooHungryDomainTestModule : AbpModule
{

}
