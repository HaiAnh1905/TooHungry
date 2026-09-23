using System.Threading.Tasks;

namespace Acme.TooHungry.Data;

public interface ITooHungryDbSchemaMigrator
{
    Task MigrateAsync();
}
