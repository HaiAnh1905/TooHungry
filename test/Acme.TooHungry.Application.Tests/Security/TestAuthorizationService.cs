using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Threading.Tasks;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Volo.Abp.Authorization;
using Volo.Abp.Authorization.Permissions;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Security.Claims;

namespace Acme.TooHungry.Security;

public class TestAuthorizationService : IAbpAuthorizationService
{
    private readonly ICurrentPrincipalAccessor _principalAccessor;

    public IServiceProvider ServiceProvider { get; }

    public ClaimsPrincipal CurrentPrincipal => _principalAccessor.Principal;

    public TestAuthorizationService(
        ICurrentPrincipalAccessor principalAccessor,
        IServiceProvider serviceProvider)
    {
        _principalAccessor = principalAccessor;
        ServiceProvider = serviceProvider;
    }

    public static bool IsAdmin(ClaimsPrincipal? user)
    {
        if (user == null) return false;
        var name = user.Identity?.Name ?? user.FindFirst(AbpClaimTypes.UserName)?.Value ?? user.FindFirst(ClaimTypes.Name)?.Value;
        if (string.Equals(name, "admin", StringComparison.OrdinalIgnoreCase)) return true;
        if (user.IsInRole("admin") || user.IsInRole("Manager")) return true;
        return false;
    }

    public Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object? resource, IEnumerable<IAuthorizationRequirement> requirements)
    {
        user ??= _principalAccessor.Principal;
        if (IsAdmin(user))
        {
            return Task.FromResult(AuthorizationResult.Success());
        }

        if (user == null || user.Identity?.IsAuthenticated != true)
        {
            return Task.FromResult(AuthorizationResult.Failed());
        }

        foreach (var req in requirements)
        {
            if (req is PermissionRequirement permReq)
            {
                if (!IsGranted(user, permReq.PermissionName))
                {
                    return Task.FromResult(AuthorizationResult.Failed());
                }
            }
        }

        return Task.FromResult(AuthorizationResult.Success());
    }

    public Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object? resource, string policyName)
    {
        user ??= _principalAccessor.Principal;
        if (IsAdmin(user))
        {
            return Task.FromResult(AuthorizationResult.Success());
        }

        if (user == null || user.Identity?.IsAuthenticated != true)
        {
            return Task.FromResult(AuthorizationResult.Failed());
        }

        if (string.IsNullOrWhiteSpace(policyName))
        {
            return Task.FromResult(AuthorizationResult.Success());
        }

        return Task.FromResult(IsGranted(user, policyName)
            ? AuthorizationResult.Success()
            : AuthorizationResult.Failed());
    }

    public static bool IsGranted(ClaimsPrincipal user, string policyName)
    {
        if (IsAdmin(user))
        {
            return true;
        }

        if (user == null || user.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        // 2. Waiter role permissions
        if (user.IsInRole("Waiter"))
        {
            var waiterPermissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                TooHungryPermissions.Orders.Create,
                TooHungryPermissions.Orders.Default,
                TooHungryPermissions.Tables.UpdateStatus,
                TooHungryPermissions.Tables.Default,
                TooHungryPermissions.Dishes.Default
            };

            return waiterPermissions.Contains(policyName);
        }

        // 3. InventoryKeeper role permissions
        if (user.IsInRole("InventoryKeeper"))
        {
            var keeperPermissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                TooHungryPermissions.Inventories.Default,
                TooHungryPermissions.Inventories.Create,
                TooHungryPermissions.Inventories.Batch,
                TooHungryPermissions.Inventories.Adjust,
                TooHungryPermissions.Inventories.Discard,
                TooHungryPermissions.Ingredients.Default
            };

            return keeperPermissions.Contains(policyName);
        }

        // 4. Explicit claims
        return user.HasClaim("Permission", policyName);
    }
}

public class TestMethodInvocationAuthorizationService : IMethodInvocationAuthorizationService
{
    private readonly IAuthorizationService _authorizationService;
    private readonly ICurrentPrincipalAccessor _principalAccessor;

    public TestMethodInvocationAuthorizationService(
        IAuthorizationService authorizationService,
        ICurrentPrincipalAccessor principalAccessor)
    {
        _authorizationService = authorizationService;
        _principalAccessor = principalAccessor;
    }

    public async Task CheckAsync(MethodInvocationAuthorizationContext context)
    {
        var targetType = context.Method.DeclaringType;
        if (context.Method.IsDefined(typeof(AllowAnonymousAttribute), true) ||
            (targetType != null && targetType.IsDefined(typeof(AllowAnonymousAttribute), true)))
        {
            return;
        }

        var authAttrs = context.Method.GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        if (targetType != null && targetType.IsDefined(typeof(AuthorizeAttribute), true))
        {
            authAttrs.AddRange(targetType.GetCustomAttributes(typeof(AuthorizeAttribute), true).Cast<AuthorizeAttribute>());
        }

        if (authAttrs.Count == 0)
        {
            return;
        }

        var principal = _principalAccessor.Principal;
        if (TestAuthorizationService.IsAdmin(principal))
        {
            return;
        }

        foreach (var attr in authAttrs)
        {
            if (!string.IsNullOrWhiteSpace(attr.Policy))
            {
                var result = await _authorizationService.AuthorizeAsync(principal, null, attr.Policy);
                if (!result.Succeeded)
                {
                    throw new AbpAuthorizationException(
                        message: $"Authorization failed for method '{context.Method.Name}'. Policy '{attr.Policy}' required.",
                        code: "AbpAuthorization:010001"
                    );
                }
            }
            else
            {
                if (principal == null || principal.Identity?.IsAuthenticated != true)
                {
                    throw new AbpAuthorizationException(
                        message: $"Authorization failed for method '{context.Method.Name}'. User must be authenticated.",
                        code: "AbpAuthorization:010001"
                    );
                }
            }
        }
    }
}

public static class TestAuthorizationServiceCollectionExtensions
{
    public static IServiceCollection AddTestAuthorization(this IServiceCollection services)
    {
        services.AddSingleton<TestAuthorizationService>();
        services.Replace(ServiceDescriptor.Singleton<IAuthorizationService>(sp => sp.GetRequiredService<TestAuthorizationService>()));
        services.Replace(ServiceDescriptor.Singleton<IAbpAuthorizationService>(sp => sp.GetRequiredService<TestAuthorizationService>()));
        services.Replace(ServiceDescriptor.Singleton<IMethodInvocationAuthorizationService, TestMethodInvocationAuthorizationService>());
        return services;
    }
}
