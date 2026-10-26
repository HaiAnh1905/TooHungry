using System;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp;
using Xunit;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Units;

namespace Acme.TooHungry.Units;

public abstract class UnitManager_Tests<TStartupModule> : TooHungryDomainTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly UnitManager _unitManager;
    private readonly IRepository<Unit, Guid> _unitRepository;

    public UnitManager_Tests()
    {
        _unitManager = GetRequiredService<UnitManager>();
        _unitRepository = GetRequiredService<IRepository<Unit, Guid>>();
    }

    [Fact]
    public async Task Should_Create_Unit()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        await WithUnitOfWorkAsync(async () =>
        {
            var unit = await _unitManager.CreateAsync($"Gram_{idStr}", $"g_{idStr}");
            unit.Name.ShouldBe($"Gram_{idStr}");
            unit.Abbreviation.ShouldBe($"g_{idStr}");
        });
    }

    [Fact]
    public async Task Should_Not_Create_Duplicate_Unit()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        await WithUnitOfWorkAsync(async () =>
        {
            var unit1 = await _unitManager.CreateAsync($"Kilogram_{idStr}", $"kg_{idStr}");
            await _unitRepository.InsertAsync(unit1);
        });

        await Assert.ThrowsAsync<BusinessException>(async () =>
        {
            await WithUnitOfWorkAsync(async () =>
            {
                await _unitManager.CreateAsync($"kilogram_{idStr}", $"kg2_{idStr}");
            });
        });
    }

    [Fact]
    public async Task Should_Update_Unit()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        Unit? unit = null;
        await WithUnitOfWorkAsync(async () =>
        {
            unit = await _unitManager.CreateAsync($"Liter_{idStr}", $"l_{idStr}");
            await _unitRepository.InsertAsync(unit);
        });

        await WithUnitOfWorkAsync(async () =>
        {
            await _unitManager.UpdateAsync(unit!, $"Liters_{idStr}", $"L_{idStr}");
        });
        
        unit!.Name.ShouldBe($"Liters_{idStr}");
        unit!.Abbreviation.ShouldBe($"L_{idStr}");
    }
}
