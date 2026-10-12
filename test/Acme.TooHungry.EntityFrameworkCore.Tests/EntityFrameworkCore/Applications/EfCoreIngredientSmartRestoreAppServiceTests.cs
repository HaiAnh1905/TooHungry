using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientSmartRestoreAppServiceTests : IngredientAppService_SmartRestore_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
