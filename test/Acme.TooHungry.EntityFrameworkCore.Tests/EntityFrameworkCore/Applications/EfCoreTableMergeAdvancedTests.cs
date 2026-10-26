using Acme.TooHungry.Tables;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableMergeAdvancedTests : TableAppService_MergeTables_Advanced_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
