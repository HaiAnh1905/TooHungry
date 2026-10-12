using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientReactivateDomainTests : Ingredient_Reactivate_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
