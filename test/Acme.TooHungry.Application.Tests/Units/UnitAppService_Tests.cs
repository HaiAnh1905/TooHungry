using System;
using System.Linq;
using System.Threading.Tasks;
using Shouldly;
using Volo.Abp;
using Xunit;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Application.Dtos;
using Acme.TooHungry.Units;

namespace Acme.TooHungry.Units;

public abstract class UnitAppService_Tests<TStartupModule> : TooHungryApplicationTestBase<TStartupModule>
    where TStartupModule : Volo.Abp.Modularity.IAbpModule
{
    private readonly IUnitAppService _unitAppService;
    private readonly IRepository<Unit, Guid> _unitRepository;

    public UnitAppService_Tests()
    {
        _unitAppService = GetRequiredService<IUnitAppService>();
        _unitRepository = GetRequiredService<IRepository<Unit, Guid>>();
    }

    [Fact]
    public async Task Should_Create_Unit()
    {
        var result = await _unitAppService.CreateAsync(new CreateUpdateUnitDto
        {
            Name = "Pound",
            Abbreviation = "lb"
        });

        result.Id.ShouldNotBe(Guid.Empty);
        result.Name.ShouldBe("Pound");
    }

    [Fact]
    public async Task Should_Get_List_Of_Units()
    {
        var idStr = Guid.NewGuid().ToString("N").Substring(0, 8);
        await _unitAppService.CreateAsync(new CreateUpdateUnitDto { Name = $"Ounce_{idStr}", Abbreviation = $"oz_{idStr}" });
        var result = await _unitAppService.GetListAsync(new PagedAndSortedResultRequestDto { MaxResultCount = 1000 });
        
        result.TotalCount.ShouldBeGreaterThan(0);
        result.Items.ShouldContain(u => u.Name == $"Ounce_{idStr}");
    }

    [Fact]
    public async Task Should_Allow_Deletion()
    {
        UnitDto? unitDto = null;
        await WithUnitOfWorkAsync(async () =>
        {
            unitDto = await _unitAppService.CreateAsync(new CreateUpdateUnitDto { Name = "Gallon", Abbreviation = "gal" });
        });

        await _unitAppService.DeleteAsync(unitDto!.Id);

        var result = await _unitRepository.FindAsync(unitDto.Id);
        result.ShouldBeNull();
    }

    [Fact]
    public async Task Should_Fallback_Abbreviation_To_Name()
    {
        var unit = await _unitAppService.CreateAsync(new CreateUpdateUnitDto
        {
            Name = "Bao",
            Abbreviation = null
        });

        unit.Name.ShouldBe("Bao");
        unit.Abbreviation.ShouldBe("Bao");
        unit.IsActive.ShouldBeTrue();
    }

    [Fact]
    public async Task Should_Not_Allow_Duplicate_Name()
    {
        var uniqueName = "TestUnit_" + Guid.NewGuid().ToString("N").Substring(0, 6);
        await _unitAppService.CreateAsync(new CreateUpdateUnitDto
        {
            Name = uniqueName,
            Abbreviation = "TU"
        });

        // Thử tạo lại với chữ thường/hoa
        await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _unitAppService.CreateAsync(new CreateUpdateUnitDto
            {
                Name = uniqueName.ToLower(),
                Abbreviation = "TU2"
            });
        });
    }

    [Fact]
    public async Task Should_Not_Allow_Deleting_System_Unit()
    {
        // Tạo hoặc lấy đơn vị tính mặc định hệ thống Kilogram
        var list = await _unitAppService.GetListAsync(new PagedAndSortedResultRequestDto { MaxResultCount = 100 });
        var kgUnit = list.Items.FirstOrDefault(x => x.Name.Equals("Kilogram", StringComparison.OrdinalIgnoreCase));

        if (kgUnit == null)
        {
            kgUnit = await _unitAppService.CreateAsync(new CreateUpdateUnitDto { Name = "Kilogram", Abbreviation = "Kg" });
        }

        var ex = await Should.ThrowAsync<BusinessException>(async () =>
        {
            await _unitAppService.DeleteAsync(kgUnit.Id);
        });

        ex.Code.ShouldBe(TooHungryDomainErrorCodes.UnitCannotDeleteDefault);
    }

    [Fact]
    public async Task Should_Update_Unit_And_Status()
    {
        var unit = await _unitAppService.CreateAsync(new CreateUpdateUnitDto
        {
            Name = "Túi",
            Abbreviation = "tui",
            IsActive = true
        });

        var updated = await _unitAppService.UpdateAsync(unit.Id, new CreateUpdateUnitDto
        {
            Name = "Túi Lớn",
            Abbreviation = "",
            IsActive = false
        });

        updated.Name.ShouldBe("Túi Lớn");
        updated.Abbreviation.ShouldBe("Túi Lớn"); // Fallback to Name
        updated.IsActive.ShouldBeFalse();
    }
}
