using Acme.TooHungry.Tables;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableMergeTests : TableAppService_Merge_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
