using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientReactivateAppServiceTests : IngredientAppService_Reactivate_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
