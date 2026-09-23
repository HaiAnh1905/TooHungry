using Acme.TooHungry.Samples;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Domains;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreSampleDomainTests : SampleDomainTests<TooHungryEntityFrameworkCoreTestModule>
{

}
