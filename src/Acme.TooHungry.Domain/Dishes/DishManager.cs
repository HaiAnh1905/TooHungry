using System;
using System.Threading.Tasks;
using Acme.TooHungry.DailyMenus;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Acme.TooHungry.Dishes;

public class DishManager : DomainService
{
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DailyMenuItem, Guid> _dailyMenuItemRepository;

    public DishManager(
        IRepository<Dish, Guid> dishRepository,
        IRepository<DailyMenuItem, Guid> dailyMenuItemRepository)
    {
        _dishRepository = dishRepository;
        _dailyMenuItemRepository = dailyMenuItemRepository;
    }

    public virtual async Task<Dish> CreateAsync(
        string name,
        decimal price,
        Guid? dishCategoryId = null,
        string? description = null,
        string? imageUrl = null,
        bool isActive = true)
    {
        Check.NotNullOrWhiteSpace(name, nameof(name));
        var cleanName = name.Trim();

        if (price < 0)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.DishNegativePrice);
        }

        await CheckDuplicateNameAsync(cleanName);

        var dish = new Dish(GuidGenerator.Create())
        {
            Name = cleanName,
            Price = price,
            DishCategoryId = dishCategoryId,
            Description = description?.Trim(),
            ImageUrl = imageUrl?.Trim(),
            IsActive = isActive
        };

        return await _dishRepository.InsertAsync(dish, autoSave: true);
    }

    public virtual async Task<Dish> UpdateAsync(
        Dish dish,
        string newName,
        decimal newPrice,
        Guid? dishCategoryId = null,
        string? description = null,
        string? imageUrl = null,
        bool isActive = true)
    {
        Check.NotNull(dish, nameof(dish));
        Check.NotNullOrWhiteSpace(newName, nameof(newName));
        var cleanName = newName.Trim();

        if (newPrice < 0)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.DishNegativePrice);
        }

        await CheckDuplicateNameAsync(cleanName, dish.Id);

        dish.Name = cleanName;
        dish.Price = newPrice;
        dish.DishCategoryId = dishCategoryId;
        dish.Description = description?.Trim();
        dish.ImageUrl = imageUrl?.Trim();
        dish.IsActive = isActive;

        return await _dishRepository.UpdateAsync(dish, autoSave: true);
    }

    public virtual async Task<Dish> ToggleActiveAsync(Dish dish)
    {
        Check.NotNull(dish, nameof(dish));
        dish.IsActive = !dish.IsActive;
        return await _dishRepository.UpdateAsync(dish, autoSave: true);
    }

    public virtual async Task DeleteWithReasonAsync(Dish dish, string deletionReason)
    {
        Check.NotNull(dish, nameof(dish));
        Check.NotNullOrWhiteSpace(deletionReason, nameof(deletionReason));

        dish.DeletionReason = deletionReason.Trim();
        await _dishRepository.UpdateAsync(dish, autoSave: true);

        // Đánh dấu các DailyMenuItem liên quan là đã ngừng phục vụ
        var dailyItems = await _dailyMenuItemRepository.GetListAsync(x => x.DishId == dish.Id);
        foreach (var item in dailyItems)
        {
            const string stoppedTag = "[Đã ngừng phục vụ]";
            if (string.IsNullOrWhiteSpace(item.Note))
            {
                item.Note = stoppedTag;
            }
            else if (!item.Note.Contains(stoppedTag))
            {
                item.Note = $"{item.Note} {stoppedTag}";
            }
            await _dailyMenuItemRepository.UpdateAsync(item);
        }

        await _dishRepository.DeleteAsync(dish);
    }

    private async Task CheckDuplicateNameAsync(string name, Guid? excludeId = null)
    {
        var exists = await _dishRepository.AnyAsync(x =>
            (excludeId == null || x.Id != excludeId) &&
            x.Name.ToLower() == name.ToLower());

        if (exists)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.DishNameAlreadyExists).WithData("0", name);
        }
    }
}
