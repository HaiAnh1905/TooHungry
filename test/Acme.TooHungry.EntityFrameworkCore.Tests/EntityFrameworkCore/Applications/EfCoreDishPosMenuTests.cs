using Acme.TooHungry.Dishes;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDishPosMenuTests : DishAppService_PosMenu_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
