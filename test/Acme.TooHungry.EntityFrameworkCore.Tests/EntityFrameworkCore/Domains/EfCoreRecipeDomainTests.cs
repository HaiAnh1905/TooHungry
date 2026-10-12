using Acme.TooHungry.Recipes;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreRecipeDomainTests : RecipeManager_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
