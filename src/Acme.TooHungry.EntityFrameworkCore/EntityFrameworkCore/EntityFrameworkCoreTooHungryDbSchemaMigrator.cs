using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Acme.TooHungry.Data;
using Volo.Abp.DependencyInjection;

namespace Acme.TooHungry.EntityFrameworkCore;

public class EntityFrameworkCoreTooHungryDbSchemaMigrator
    : ITooHungryDbSchemaMigrator, ITransientDependency
{
    private readonly IServiceProvider _serviceProvider;

    public EntityFrameworkCoreTooHungryDbSchemaMigrator(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task MigrateAsync()
    {
        /* We intentionally resolving the TooHungryDbContext
         * from IServiceProvider (instead of directly injecting it)
         * to properly get the connection string of the current tenant in the
         * current scope.
         */

        await _serviceProvider
            .GetRequiredService<TooHungryDbContext>()
            .Database
            .MigrateAsync();
    }
}
