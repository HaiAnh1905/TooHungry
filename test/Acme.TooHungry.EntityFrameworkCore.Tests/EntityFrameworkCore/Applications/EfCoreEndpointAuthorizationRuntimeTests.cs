using Acme.TooHungry.Security;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreEndpointAuthorizationRuntimeTests : EndpointAuthorization_Runtime_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
