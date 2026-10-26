using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.Modularity;
using Volo.Abp.Security.Claims;
using Volo.Abp.Users;

namespace Acme.TooHungry;

public abstract class TooHungryApplicationTestBase<TStartupModule> : TooHungryTestBase<TStartupModule>
    where TStartupModule : IAbpModule
{
    protected ICurrentUser CurrentUser => GetRequiredService<ICurrentUser>();
    protected ICurrentPrincipalAccessor CurrentPrincipalAccessor => GetRequiredService<ICurrentPrincipalAccessor>();

    /// <summary>
    /// Giả lập chuyển đổi ngữ cảnh người dùng thời gian chạy (ClaimsPrincipal)
    /// </summary>
    protected IDisposable ChangeUserContext(Guid? userId, string? userName, params string[] roles)
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim(AbpClaimTypes.UserId, userId.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString()));
        }
        if (!string.IsNullOrWhiteSpace(userName))
        {
            claims.Add(new Claim(AbpClaimTypes.UserName, userName));
            claims.Add(new Claim(ClaimTypes.Name, userName));
        }
        foreach (var role in roles)
        {
            claims.Add(new Claim(AbpClaimTypes.Role, role));
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var identity = new ClaimsIdentity(claims, userId.HasValue ? "TestAuth" : null);
        var principal = new ClaimsPrincipal(identity);

        return CurrentPrincipalAccessor.Change(principal);
    }

    /// <summary>
    /// Giả lập người dùng vô danh (chưa đăng nhập / Unauthenticated)
    /// </summary>
    protected IDisposable ChangeToAnonymous()
    {
        return ChangeUserContext(null, null);
    }

    /// <summary>
    /// Giả lập nhân viên phục vụ (Waiter)
    /// </summary>
    protected IDisposable ChangeToWaiter(Guid? userId = null)
    {
        return ChangeUserContext(userId ?? Guid.NewGuid(), "waiter_user", "Waiter");
    }

    /// <summary>
    /// Giả lập thủ kho (InventoryKeeper)
    /// </summary>
    protected IDisposable ChangeToInventoryKeeper(Guid? userId = null)
    {
        return ChangeUserContext(userId ?? Guid.NewGuid(), "keeper_user", "InventoryKeeper");
    }

    /// <summary>
    /// Giả lập quản trị viên (Admin)
    /// </summary>
    protected IDisposable ChangeToAdmin(Guid? userId = null)
    {
        return ChangeUserContext(userId ?? Guid.NewGuid(), "admin", "admin");
    }

    /// <summary>
    /// Chạy song song workerCount tác vụ trên các DI Scope độc lập để mô phỏng tương tranh
    /// </summary>
    protected async Task RunConcurrentScopesAsync(int workerCount, Func<IServiceProvider, int, Task> action)
    {
        var scopeFactory = GetRequiredService<IServiceScopeFactory>();
        var tasks = new Task[workerCount];

        for (int i = 0; i < workerCount; i++)
        {
            var workerIndex = i;
            tasks[i] = Task.Run(async () =>
            {
                using var scope = scopeFactory.CreateScope();
                await action(scope.ServiceProvider, workerIndex);
            });
        }

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Chạy song song 2 tác vụ cạnh tranh trên cùng tài nguyên và trả về kết quả / ngoại lệ
    /// </summary>
    protected async Task<(T1? Result1, Exception? Error1, T2? Result2, Exception? Error2)> ExecuteRaceConditionAsync<T1, T2>(
        Func<IServiceProvider, Task<T1>> action1,
        Func<IServiceProvider, Task<T2>> action2)
    {
        var scopeFactory = GetRequiredService<IServiceScopeFactory>();

        T1? result1 = default;
        Exception? error1 = null;
        T2? result2 = default;
        Exception? error2 = null;

        var task1 = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            try
            {
                result1 = await action1(scope.ServiceProvider);
            }
            catch (Exception ex)
            {
                error1 = ex;
            }
        });

        var task2 = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            try
            {
                result2 = await action2(scope.ServiceProvider);
            }
            catch (Exception ex)
            {
                error2 = ex;
            }
        });

        await Task.WhenAll(task1, task2);
        return (result1, error1, result2, error2);
    }
}
