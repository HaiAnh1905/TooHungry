using Acme.TooHungry.Localization;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry;

/* Inherit your application services from this class.
 */
public abstract class TooHungryAppService : ApplicationService
{
    protected TooHungryAppService()
    {
        LocalizationResource = typeof(TooHungryResource);
    }
}
