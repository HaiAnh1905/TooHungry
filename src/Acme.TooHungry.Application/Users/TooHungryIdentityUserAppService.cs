using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Identity;

namespace Acme.TooHungry.Users;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IIdentityUserAppService), typeof(IdentityUserAppService), typeof(TooHungryIdentityUserAppService))]
public class TooHungryIdentityUserAppService : IdentityUserAppService
{
    public TooHungryIdentityUserAppService(
        IdentityUserManager userManager,
        IIdentityUserRepository userRepository,
        IIdentityRoleRepository roleRepository,
        IOptions<IdentityOptions> identityOptions,
        IPermissionChecker permissionChecker)
        : base(userManager, userRepository, roleRepository, identityOptions, permissionChecker)
    {
    }

    protected override async Task<bool> HasAdminRoleAsync()
    {
        var isDefaultAdmin = await base.HasAdminRoleAsync();
        return isDefaultAdmin || CurrentUser.IsInRole("Administrator");
    }

    public override async Task<ListResultDto<IdentityRoleDto>> GetAssignableRolesAsync()
    {
        if (await HasAdminRoleAsync())
        {
            var list = (await RoleRepository.GetListAsync()).OrderBy(x => x.Name).ToList();
            return new ListResultDto<IdentityRoleDto>(
                ObjectMapper.Map<List<IdentityRole>, List<IdentityRoleDto>>(list)
            );
        }

        return await base.GetAssignableRolesAsync();
    }
}
