using Acme.TooHungry.Security;
using Xunit;

namespace Acme.TooHungry.EntityFrameworkCore.Applications;

[Collection(TooHungryTestConsts.CollectionDefinitionName)]
public class EfCoreRoleBasedAuthorizationTests : RoleBasedAuthorization_Tests<TooHungryEntityFrameworkCoreTestModule>
{
}
