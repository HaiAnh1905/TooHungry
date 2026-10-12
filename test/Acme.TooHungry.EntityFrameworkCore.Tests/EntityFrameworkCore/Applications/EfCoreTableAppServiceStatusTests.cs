using Acme.TooHungry.Tables;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableAppServiceStatusTests : TableAppService_Status_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
