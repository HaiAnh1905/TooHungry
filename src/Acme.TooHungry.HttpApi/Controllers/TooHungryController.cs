using Acme.TooHungry.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace Acme.TooHungry.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class TooHungryController : AbpControllerBase
{
    protected TooHungryController()
    {
        LocalizationResource = typeof(TooHungryResource);
    }
}
