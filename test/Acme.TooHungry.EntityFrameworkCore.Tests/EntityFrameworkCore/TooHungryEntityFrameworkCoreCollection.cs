using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore;

[CollectionDefinition(TooHungryTestConsts.CollectionDefinitionName)]
public class TooHungryEntityFrameworkCoreCollection : ICollectionFixture<TooHungryEntityFrameworkCoreFixture>
{

}
