using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Acme.TooHungry.Data;
using Acme.TooHungry.Identity;
using Serilog;
using Volo.Abp;
using Volo.Abp.Data;
using Volo.Abp.Identity;

namespace Acme.TooHungry.DbMigrator;

public class DbMigratorHostedService : IHostedService
{
    private readonly IHostApplicationLifetime _hostApplicationLifetime;
    private readonly IConfiguration _configuration;

    public DbMigratorHostedService(IHostApplicationLifetime hostApplicationLifetime, IConfiguration configuration)
    {
        _hostApplicationLifetime = hostApplicationLifetime;
        _configuration = configuration;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using (var application = await AbpApplicationFactory.CreateAsync<TooHungryDbMigratorModule>(options =>
        {
           options.Services.ReplaceConfiguration(_configuration);
           options.UseAutofac();
           options.Services.AddLogging(c => c.AddSerilog());
           options.AddDataMigrationEnvironment();
        }))
        {
            await application.InitializeAsync();

            var isUnlockAdmin = _configuration.GetValue<bool>("unlock-admin")
                                || Environment.GetCommandLineArgs().Any(a => a.Equals("--unlock-admin", StringComparison.OrdinalIgnoreCase));

            if (isUnlockAdmin)
            {
                var userManager = application.ServiceProvider.GetRequiredService<IdentityUserManager>();
                var lockoutManager = application.ServiceProvider.GetRequiredService<IUserLockoutManager>();
                var adminUser = await userManager.FindByNameAsync("admin");
                if (adminUser != null)
                {
                    await lockoutManager.AdminUnlockAsync(adminUser);
                    Log.Information("[CLI_RECOVERY] Successfully unlocked administrator account 'admin'. Lockout level and failed attempts reset to 0.");
                }
                else
                {
                    Log.Warning("[CLI_RECOVERY] Admin account 'admin' not found.");
                }
            }
            else
            {
                await application
                    .ServiceProvider
                    .GetRequiredService<TooHungryDbMigrationService>()
                    .MigrateAsync();
            }

            await application.ShutdownAsync();

            _hostApplicationLifetime.StopApplication();
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
