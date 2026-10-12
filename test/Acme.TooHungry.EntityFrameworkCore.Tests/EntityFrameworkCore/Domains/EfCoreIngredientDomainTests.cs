using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientDomainTests : IngredientManager_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
