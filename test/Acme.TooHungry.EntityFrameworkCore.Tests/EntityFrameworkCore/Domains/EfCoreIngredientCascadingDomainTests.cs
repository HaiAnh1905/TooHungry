using Acme.TooHungry.Ingredients;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreIngredientCascadingDomainTests : IngredientManager_Cascading_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
