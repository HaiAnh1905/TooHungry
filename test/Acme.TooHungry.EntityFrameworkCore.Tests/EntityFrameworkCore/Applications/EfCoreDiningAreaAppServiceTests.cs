using Acme.TooHungry.DiningAreas;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDiningAreaAppServiceTests : DiningAreaAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{

}
