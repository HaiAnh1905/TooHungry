using Acme.TooHungry.Dishes;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDishCategoryAppServiceTests : DishCategoryAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDishAppServiceTests : DishAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
