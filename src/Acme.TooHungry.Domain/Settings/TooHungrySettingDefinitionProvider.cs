using Volo.Abp.Localization;
using Volo.Abp.Settings;

namespace Acme.TooHungry.Settings;

public class TooHungrySettingDefinitionProvider : SettingDefinitionProvider
{
    public override void Define(ISettingDefinitionContext context)
    {
        var defaultLanguage = context.GetOrNull(LocalizationSettingNames.DefaultLanguage);
        if (defaultLanguage != null)
        {
            defaultLanguage.DefaultValue = "vi";
        }
    }
}
