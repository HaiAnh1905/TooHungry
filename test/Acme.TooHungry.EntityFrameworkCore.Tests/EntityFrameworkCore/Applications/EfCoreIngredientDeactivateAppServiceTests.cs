using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientDeactivateAppServiceTests : IngredientAppService_Deactivate_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
