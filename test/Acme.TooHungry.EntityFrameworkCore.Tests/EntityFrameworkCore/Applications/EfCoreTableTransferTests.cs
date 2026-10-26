using Acme.TooHungry.Tables;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreTableTransferTests : TableAppService_TransferTable_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
