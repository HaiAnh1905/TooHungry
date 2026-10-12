using Acme.TooHungry.Recipes;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreRecipeAppServiceTests : RecipeAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
