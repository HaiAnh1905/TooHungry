using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientAppServiceTests : IngredientAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
