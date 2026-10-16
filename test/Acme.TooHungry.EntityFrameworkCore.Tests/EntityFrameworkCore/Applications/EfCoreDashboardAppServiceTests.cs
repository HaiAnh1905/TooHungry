using Acme.TooHungry.Dashboard;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreDashboardAppServiceTests : DashboardAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
