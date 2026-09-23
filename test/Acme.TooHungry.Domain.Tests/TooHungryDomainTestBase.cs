using Volo.Abp.Modularity;

namespace Acme.TooHungry;

/* Inherit from this class for your domain layer tests. */
public abstract class TooHungryDomainTestBase<TStartupModule> : TooHungryTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{

}
