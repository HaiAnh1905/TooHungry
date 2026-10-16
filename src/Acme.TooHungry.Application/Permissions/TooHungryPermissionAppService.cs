using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.PermissionManagement;
using Volo.Abp.SimpleStateChecking;

namespace Acme.TooHungry.Permissions;

[Dependency(ReplaceServices = true)]
[ExposeServices(typeof(IPermissionAppService), typeof(PermissionAppService), typeof(TooHungryPermissionAppService))]
public class TooHungryPermissionAppService : PermissionAppService
{
    public TooHungryPermissionAppService(
        IPermissionManager permissionManager,
        IPermissionChecker permissionChecker,
        IPermissionDefinitionManager permissionDefinitionManager,
        IResourcePermissionManager resourcePermissionManager,
        IResourcePermissionGrantRepository resourcePermissionGrantRepository,
        IOptions<PermissionManagementOptions> options,
        ISimpleStateCheckerManager<PermissionDefinition> simpleStateCheckerManager)
        : base(
            permissionManager,
            permissionChecker,
            permissionDefinitionManager,
            resourcePermissionManager,
            resourcePermissionGrantRepository,
            options,
            simpleStateCheckerManager)
    {
    }

    protected override async Task<bool> HasAdminRoleAsync()
    {
        var isDefaultAdmin = await base.HasAdminRoleAsync();
        return isDefaultAdmin ||
               CurrentUser.IsInRole("Administrator") ||
               string.Equals(CurrentUser.UserName, "admin", StringComparison.OrdinalIgnoreCase);
    }
}
