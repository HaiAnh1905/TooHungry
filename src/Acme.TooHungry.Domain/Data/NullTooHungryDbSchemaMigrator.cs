using System.Threading.Tasks;
using Volo.Abp.DependencyInjection;

namespace Acme.TooHungry.Data;

/* This is used if database provider does't define
 * ITooHungryDbSchemaMigrator implementation.
 */
public class NullTooHungryDbSchemaMigrator : ITooHungryDbSchemaMigrator, ITransientDependency
{
    public Task MigrateAsync()
    {
        return Task.CompletedTask;
    }
}
