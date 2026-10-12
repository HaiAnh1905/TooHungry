using System;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Acme.TooHungry.Dishes;

public class DishCategoryManager : DomainService
{
    private readonly IRepository<DishCategory, Guid> _categoryRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;

    public DishCategoryManager(
        IRepository<DishCategory, Guid> categoryRepository,
        IRepository<Dish, Guid> dishRepository)
    {
        _categoryRepository = categoryRepository;
        _dishRepository = dishRepository;
    }

    public virtual async Task<DishCategory> CreateAsync(string name, string? description = null, int displayOrder = 0)
    {
        Check.NotNullOrWhiteSpace(name, nameof(name));
        var cleanName = name.Trim();

        await CheckDuplicateNameAsync(cleanName);

        var category = new DishCategory(GuidGenerator.Create())
        {
            Name = cleanName,
            Description = description?.Trim(),
            DisplayOrder = displayOrder
        };

        return await _categoryRepository.InsertAsync(category, autoSave: true);
    }

    public virtual async Task<DishCategory> UpdateAsync(DishCategory category, string newName, string? newDescription = null, int displayOrder = 0)
    {
        Check.NotNull(category, nameof(category));
        Check.NotNullOrWhiteSpace(newName, nameof(newName));
        var cleanName = newName.Trim();

        await CheckDuplicateNameAsync(cleanName, category.Id);

        category.Name = cleanName;
        category.Description = newDescription?.Trim();
        category.DisplayOrder = displayOrder;

        return await _categoryRepository.UpdateAsync(category, autoSave: true);
    }

    public virtual async Task CheckCanDeleteAsync(Guid categoryId)
    {
        var count = await _dishRepository.CountAsync(x => x.DishCategoryId == categoryId);
        if (count > 0)
        {
            throw new UserFriendlyException($"Không thể xóa danh mục vì đang có {count} món ăn trực thuộc! Vui lòng chuyển các món ăn sang danh mục khác trước khi xóa.");
        }
    }

    private async Task CheckDuplicateNameAsync(string name, Guid? excludeId = null)
    {
        var exists = await _categoryRepository.AnyAsync(x =>
            (excludeId == null || x.Id != excludeId) &&
            x.Name.ToLower() == name.ToLower());

        if (exists)
        {
            throw new UserFriendlyException($"Danh mục món ăn '{name}' đã tồn tại trên hệ thống!");
        }
    }
}
