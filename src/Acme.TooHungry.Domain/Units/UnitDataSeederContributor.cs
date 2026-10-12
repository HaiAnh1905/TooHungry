using System;
using System.Threading.Tasks;
using Volo.Abp.Data;
using Volo.Abp.DependencyInjection;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Units;

public class UnitDataSeederContributor : IDataSeedContributor, ITransientDependency
{
    private readonly UnitManager _unitManager;
    private readonly IRepository<Unit, Guid> _unitRepository;

    public UnitDataSeederContributor(
        UnitManager unitManager,
        IRepository<Unit, Guid> unitRepository)
    {
        _unitManager = unitManager;
        _unitRepository = unitRepository;
    }

    public async Task SeedAsync(DataSeedContext context)
    {
        var defaultUnits = new (string Name, string Abbreviation)[]
        {
            ("Kilogram", "Kg"),
            ("Gam", "g"),
            ("Lít", "L"),
            ("Mililit", "ml"),
            ("Chai", "Chai"),
            ("Thùng", "Thùng"),
            ("Lon", "Lon"),
            ("Gói", "Gói"),
            ("Quả", "Quả"),
            ("Đĩa", "Đĩa")
        };

        foreach (var (name, abbr) in defaultUnits)
        {
            try
            {
                if (!await _unitRepository.AnyAsync(x => x.Name.ToLower() == name.ToLower() || x.Abbreviation.ToLower() == abbr.ToLower()))
                {
                    var unit = await _unitManager.CreateAsync(name, abbr);
                    await _unitRepository.InsertAsync(unit, autoSave: true);
                }
            }
            catch
            {
                // Ignore if already created concurrently
            }
        }
    }
}
