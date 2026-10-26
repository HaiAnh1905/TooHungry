using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Permissions;

namespace Acme.TooHungry.Dishes;

[Authorize(TooHungryPermissions.DishCategories.Default)]
public class DishCategoryAppService : TooHungryAppService, IDishCategoryAppService
{
    private readonly IRepository<DishCategory, Guid> _dishCategoryRepository;
    private readonly DishCategoryManager _dishCategoryManager;

    public DishCategoryAppService(
        IRepository<DishCategory, Guid> dishCategoryRepository,
        DishCategoryManager dishCategoryManager)
    {
        _dishCategoryRepository = dishCategoryRepository;
        _dishCategoryManager = dishCategoryManager;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một danh mục món ăn theo Id
    /// </summary>
    [Authorize(TooHungryPermissions.DishCategories.Default)]
    public virtual async Task<DishCategoryDto> GetAsync(Guid id)
    {
        var category = await _dishCategoryRepository.GetAsync(id);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(category);
    }

    /// <summary>
    /// Lấy danh sách danh mục món ăn có phân trang và sắp xếp (mặc định theo DisplayOrder ASC, Name ASC)
    /// </summary>
    [Authorize(TooHungryPermissions.DishCategories.Default)]
    public virtual async Task<PagedResultDto<DishCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _dishCategoryRepository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace()
            ? $"{nameof(DishCategory.DisplayOrder)} asc, {nameof(DishCategory.Name)} asc"
            : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DishCategory>, List<DishCategoryDto>>(items);
        return new PagedResultDto<DishCategoryDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một danh mục món ăn (sử dụng DishCategoryManager để kiểm tra trùng tên)
    /// </summary>
    [Authorize(TooHungryPermissions.DishCategories.Create)]
    public virtual async Task<DishCategoryDto> CreateAsync(CreateUpdateDishCategoryDto input)
    {
        var created = await _dishCategoryManager.CreateAsync(input.Name, input.Description, input.DisplayOrder);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(created);
    }

    /// <summary>
    /// Cập nhật thông tin danh mục món ăn (kiểm tra trùng tên)
    /// </summary>
    [Authorize(TooHungryPermissions.DishCategories.Edit)]
    public virtual async Task<DishCategoryDto> UpdateAsync(Guid id, CreateUpdateDishCategoryDto input)
    {
        var category = await _dishCategoryRepository.GetAsync(id);
        var updated = await _dishCategoryManager.UpdateAsync(category, input.Name, input.Description, input.DisplayOrder);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(updated);
    }

    /// <summary>
    /// Xóa một danh mục món ăn (chặn xóa nếu danh mục đang được các món ăn sử dụng)
    /// </summary>
    [Authorize(TooHungryPermissions.DishCategories.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        await _dishCategoryManager.CheckCanDeleteAsync(id);
        await _dishCategoryRepository.DeleteAsync(id);
    }
}
