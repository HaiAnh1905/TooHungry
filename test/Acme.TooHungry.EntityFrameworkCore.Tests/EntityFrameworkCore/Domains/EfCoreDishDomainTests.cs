using Acme.TooHungry.Dishes;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDishCategoryManagerTests : DishCategoryManager_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDishManagerTests : DishManager_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
