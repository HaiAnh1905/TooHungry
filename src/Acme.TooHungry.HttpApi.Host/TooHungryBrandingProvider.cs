using Microsoft.Extensions.Localization;
using Acme.TooHungry.Localization;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Ui.Branding;

namespace Acme.TooHungry;

[Dependency(ReplaceServices = true)]
public class TooHungryBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<TooHungryResource> _localizer;

    public TooHungryBrandingProvider(IStringLocalizer<TooHungryResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
