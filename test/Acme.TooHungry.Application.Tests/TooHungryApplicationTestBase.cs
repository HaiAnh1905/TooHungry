using Volo.Abp.Modularity;

namespace Acme.TooHungry;

public abstract class TooHungryApplicationTestBase<TStartupModule> : TooHungryTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
