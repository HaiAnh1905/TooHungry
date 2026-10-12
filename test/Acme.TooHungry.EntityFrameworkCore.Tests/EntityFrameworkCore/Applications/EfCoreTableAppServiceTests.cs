using Acme.TooHungry.Tables;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableAppServiceTests : TableAppService_Tests<TooHungryEntityFrameworkCoreTestModule>
{

}
