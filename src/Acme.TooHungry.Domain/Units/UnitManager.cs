using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;
using Acme.TooHungry.Ingredients;

namespace Acme.TooHungry.Units;

public class UnitManager : DomainService
{
    private static readonly string[] SystemDefaultUnits = new[]
    {
        "Kilogram", "Gam", "Lít", "Mililit", "Chai", "Thùng", "Lon", "Gói", "Quả", "Đĩa"
    };

    private readonly IRepository<Unit, Guid> _unitRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    public UnitManager(
        IRepository<Unit, Guid> unitRepository,
        IRepository<Ingredient, Guid> ingredientRepository)
    {
        _unitRepository = unitRepository;
        _ingredientRepository = ingredientRepository;
    }

    public virtual async Task<Unit> CreateAsync(string name, string? abbreviation, bool isActive = true)
    {
        Check.NotNullOrWhiteSpace(name, nameof(name));
        var cleanName = name.Trim();
        var isExist = await _unitRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Đơn vị tính '{cleanName}' đã tồn tại!");
        }

        var cleanAbbr = string.IsNullOrWhiteSpace(abbreviation) ? cleanName : abbreviation.Trim();

        return new Unit
        {
            Name = cleanName,
            Abbreviation = cleanAbbr,
            IsActive = isActive
        };
    }

    public virtual async Task UpdateAsync(Unit unit, string newName, string? newAbbreviation, bool isActive = true)
    {
        Check.NotNullOrWhiteSpace(newName, nameof(newName));
        var cleanName = newName.Trim();

        if (!string.Equals(unit.Name, cleanName, StringComparison.OrdinalIgnoreCase))
        {
            var isExist = await _unitRepository.AnyAsync(x => x.Id != unit.Id && x.Name.ToLower() == cleanName.ToLower());
            if (isExist)
            {
                throw new UserFriendlyException($"Đơn vị tính '{cleanName}' đã tồn tại!");
            }
        }

        var cleanAbbr = string.IsNullOrWhiteSpace(newAbbreviation) ? cleanName : newAbbreviation.Trim();

        unit.Name = cleanName;
        unit.Abbreviation = cleanAbbr;
        unit.IsActive = isActive;
    }

    public virtual async Task CheckCanDeleteAsync(Guid id)
    {
        var unit = await _unitRepository.FindAsync(id);
        if (unit == null)
        {
            throw new EntityNotFoundException(typeof(Unit), id);
        }

        // 1. Chặn xóa đơn vị tính mặc định hệ thống
        if (SystemDefaultUnits.Any(su => string.Equals(su, unit.Name, StringComparison.OrdinalIgnoreCase)))
        {
            throw new UserFriendlyException("Không thể xóa đơn vị tính mặc định của hệ thống!");
        }

        // 2. Chặn xóa nếu đang được sử dụng bởi nguyên liệu
        var isUsed = await _ingredientRepository.AnyAsync(i =>
            i.BaseUnit.ToLower() == unit.Name.ToLower() ||
            (!string.IsNullOrEmpty(unit.Abbreviation) && i.BaseUnit.ToLower() == unit.Abbreviation.ToLower()));
        if (isUsed)
        {
            throw new UserFriendlyException("Không thể xóa đơn vị tính này vì đang được sử dụng bởi các nguyên liệu trong hệ thống!");
        }
    }
}
