using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace Acme.TooHungry;

public class Program
{
    public async static Task<int> Main(string[] args)
    {
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Async(c => c.File("Logs/logs.txt"))
            .WriteTo.Async(c => c.Console())
            .CreateBootstrapLogger();

        try
        {
            LoadDotEnv();
            Log.Information("Starting Acme.TooHungry.HttpApi.Host.");
            var builder = WebApplication.CreateBuilder(args);
            builder.Host
                .AddAppSettingsSecretsJson()
                .UseAutofac()
                .UseSerilog((context, services, loggerConfiguration) =>
                {
                    loggerConfiguration
                        .ReadFrom.Configuration(context.Configuration)
                        .ReadFrom.Services(services)
                        .WriteTo.Async(c => c.AbpStudio(services));
                });
            await builder.AddApplicationAsync<TooHungryHttpApiHostModule>();
            var app = builder.Build();
            await app.InitializeApplicationAsync();
            await app.RunAsync();
            return 0;
        }
        catch (Exception ex)
        {
            if (ex is HostAbortedException)
            {
                throw;
            }

            Log.Fatal(ex, "Host terminated unexpectedly!");
            return 1;
        }
        finally
        {
            Log.CloseAndFlush();
        }
    }

    private static void LoadDotEnv()
    {
        try
        {
            string[] searchPaths =
            [
                System.IO.Path.Combine(AppContext.BaseDirectory, ".env"),
                System.IO.Path.Combine(Environment.CurrentDirectory, ".env"),
                System.IO.Path.Combine(Environment.CurrentDirectory, "..", "..", ".env"),
                System.IO.Path.Combine(Environment.CurrentDirectory, "..", "..", "..", ".env")
            ];

            foreach (var path in searchPaths)
            {
                if (System.IO.File.Exists(path))
                {
                    foreach (var rawLine in System.IO.File.ReadAllLines(path))
                    {
                        var line = rawLine.Trim();
                        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                        {
                            continue;
                        }

                        var parts = line.Split('=', 2, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length == 2)
                        {
                            var key = parts[0].Trim();
                            var val = parts[1].Trim();
                            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                            {
                                Environment.SetEnvironmentVariable(key, val);
                            }
                        }
                    }
                    break;
                }
            }
        }
        catch
        {
            // Bỏ qua lỗi nếu không đọc được file .env
        }
    }
}
