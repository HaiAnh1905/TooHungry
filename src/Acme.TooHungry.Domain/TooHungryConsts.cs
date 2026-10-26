using System;
using Volo.Abp.Identity;

namespace Acme.TooHungry;

public static class TooHungryConsts
{
    public const string DbTablePrefix = "App";
    public const string? DbSchema = null;
    public const string AdminEmailDefaultValue = IdentityDataSeedContributor.AdminEmailDefaultValue;
    public const string AdminPasswordDefaultValue = "1q2w3E*";

    public const int BusinessOpeningHour = 8;
    public const int BusinessClosingHour = 22;

    public static string GenerateOrderNumber(DateTime now) => CodeGenerator.GenerateOrderNumber(now);
    public static string GenerateBatchCode(DateTime now) => CodeGenerator.GenerateBatchCode(now);
}

public static class CodeGenerator
{
    public static string GenerateOrderNumber(DateTime now)
    {
        var salt4 = Guid.NewGuid().ToString("N")[..4].ToUpperInvariant();
        return $"ORD-{now:yyyyMMddHHmmss}-{salt4}";
    }

    public static string GenerateBatchCode(DateTime now)
    {
        var salt4 = Guid.NewGuid().ToString("N")[..4].ToUpperInvariant();
        return $"BATCH-{now:yyyyMMddHHmmss}-{salt4}";
    }
}
