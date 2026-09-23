using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Acme.TooHungry.EntityFrameworkCore;

/* This class is needed for EF Core console commands
 * (like Add-Migration and Update-Database commands) */
public class TooHungryDbContextFactory : IDesignTimeDbContextFactory<TooHungryDbContext>
{
    public TooHungryDbContext CreateDbContext(string[] args)
    {
        var configuration = BuildConfiguration();
        
        TooHungryEfCoreEntityExtensionMappings.Configure();

        var builder = new DbContextOptionsBuilder<TooHungryDbContext>()
            .UseSqlServer(configuration.GetConnectionString("Default"));
        
        return new TooHungryDbContext(builder.Options);
    }

    private static IConfigurationRoot BuildConfiguration()
    {
        var builder = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../Acme.TooHungry.DbMigrator/"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddEnvironmentVariables();

        return builder.Build();
    }
}
