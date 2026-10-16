using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

using Acme.TooHungry.Permissions;

namespace Acme.TooHungry.Dishes;

[RemoteService(IsEnabled = false)]
[Authorize]
public class DishAppService : TooHungryAppService, IDishAppService
{
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DishCategory, Guid> _dishCategoryRepository;
    private readonly DishManager _dishManager;

    public DishAppService(
        IRepository<Dish, Guid> dishRepository,
        IRepository<DishCategory, Guid> dishCategoryRepository,
        DishManager dishManager)
    {
        _dishRepository = dishRepository;
        _dishCategoryRepository = dishCategoryRepository;
        _dishManager = dishManager;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một món ăn theo Id (kèm thông tin danh mục)
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Default)]
    public virtual async Task<DishDto> GetAsync(Guid id)
    {
        var queryable = await _dishRepository.WithDetailsAsync(x => x.DishCategory!);
        var dish = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (dish == null)
        {
            throw new EntityNotFoundException(typeof(Dish), id);
        }

        var dto = ObjectMapper.Map<Dish, DishDto>(dish);
        dto.DishCategoryName = dish.DishCategory?.Name;

        return dto;
    }

    /// <summary>
    /// Tạo mới một món ăn vào thực đơn nhà hàng (sử dụng DishManager để kiểm tra nghiệp vụ)
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Create)]
    public virtual async Task<DishDto> CreateAsync(CreateUpdateDishDto input)
    {
        var createdDish = await _dishManager.CreateAsync(
            name: input.Name,
            price: input.Price,
            dishCategoryId: input.DishCategoryId,
            description: input.Description,
            imageUrl: input.ImageUrl,
            isActive: input.IsActive
        );

        return ObjectMapper.Map<Dish, DishDto>(createdDish);
    }

    /// <summary>
    /// Lấy danh sách món ăn có phân trang và bộ lọc (theo từ khóa, danh mục món ăn, và trạng thái IsActive)
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Default)]
    public virtual async Task<PagedResultDto<DishDto>> GetListAsync(GetDishesInput input)
    {
        var queryable = await _dishRepository.WithDetailsAsync(x => x.DishCategory!);

        // Lọc theo từ khóa tìm kiếm trong Tên hoặc Mô tả món ăn
        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.Name.ToLower().Contains(filter) || (x.Description != null && x.Description.ToLower().Contains(filter)));
        }

        // Lọc theo Danh mục món ăn
        if (input.DishCategoryId.HasValue && input.DishCategoryId.Value != Guid.Empty)
        {
            queryable = queryable.Where(x => x.DishCategoryId == input.DishCategoryId.Value);
        }

        // Lọc theo trạng thái Đang phục vụ / Tạm ngưng (Tab filtering)
        if (input.IsActive.HasValue)
        {
            queryable = queryable.Where(x => x.IsActive == input.IsActive.Value);
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Dish.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Dish>, List<DishDto>>(items);

        // Bổ sung Tên danh mục cho từng item
        for (int i = 0; i < items.Count; i++)
        {
            dtos[i].DishCategoryName = items[i].DishCategory?.Name;
        }

        return new PagedResultDto<DishDto>(totalCount, dtos);
    }

    /// <summary>
    /// Cập nhật thông tin một món ăn trong thực đơn
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Edit)]
    public virtual async Task<DishDto> UpdateAsync(Guid id, CreateUpdateDishDto input)
    {
        var dish = await _dishRepository.GetAsync(id);

        var updatedDish = await _dishManager.UpdateAsync(
            dish: dish,
            newName: input.Name,
            newPrice: input.Price,
            dishCategoryId: input.DishCategoryId,
            description: input.Description,
            imageUrl: input.ImageUrl,
            isActive: input.IsActive
        );

        return ObjectMapper.Map<Dish, DishDto>(updatedDish);
    }

    /// <summary>
    /// Bật/tắt nhanh trạng thái kinh doanh của món ăn
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Edit)]
    public virtual async Task<DishDto> ToggleActiveAsync(Guid id)
    {
        var dish = await _dishRepository.GetAsync(id);
        var updated = await _dishManager.ToggleActiveAsync(dish);
        return ObjectMapper.Map<Dish, DishDto>(updated);
    }

    /// <summary>
    /// Cập nhật trạng thái kinh doanh hàng loạt cho danh sách món ăn đã chọn
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Edit)]
    public virtual async Task<BulkActionResultDto> BulkToggleActiveAsync(BulkToggleActiveDishDto input)
    {
        Check.NotNull(input, nameof(input));
        if (input.DishIds == null || input.DishIds.Count == 0)
        {
            return new BulkActionResultDto
            {
                Success = true,
                UpdatedCount = 0,
                Message = "Không có món ăn nào được chọn."
            };
        }

        var dishes = await _dishRepository.GetListAsync(x => input.DishIds.Contains(x.Id));
        foreach (var dish in dishes)
        {
            dish.IsActive = input.IsActive;
            await _dishRepository.UpdateAsync(dish, autoSave: false);
        }

        var actionText = input.IsActive ? "kích hoạt" : "tạm ngưng";
        return new BulkActionResultDto
        {
            Success = true,
            UpdatedCount = dishes.Count,
            Message = $"Đã {actionText} thành công {dishes.Count} món ăn."
        };
    }

    /// <summary>
    /// Xóa một món ăn khỏi thực đơn nhà hàng (Soft Delete thông thường)
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        await _dishRepository.DeleteAsync(id);
    }

    /// <summary>
    /// Xóa món ăn kèm lý do bắt buộc để phục vụ kiểm toán và cập nhật DailyMenuItem
    /// </summary>
    [Authorize(TooHungryPermissions.Dishes.Delete)]
    public virtual async Task DeleteWithReasonAsync(Guid id, DeleteDishDto input)
    {
        var dish = await _dishRepository.GetAsync(id);
        await _dishManager.DeleteWithReasonAsync(dish, input.DeletionReason);
    }

    /// <summary>
    /// Lấy danh sách món ăn đang phục vụ phục vụ màn hình POS gom nhóm theo danh mục
    /// </summary>
    public virtual async Task<ListResultDto<DishDto>> GetMenuForPosAsync()
    {
        var queryable = await _dishRepository.WithDetailsAsync(x => x.DishCategory!);
        queryable = queryable.Where(x => x.IsActive);

        var items = await AsyncExecuter.ToListAsync(queryable);
        // Sắp xếp theo DisplayOrder của danh mục, rồi tới tên danh mục, rồi tới tên món
        items = items.OrderBy(x => x.DishCategory?.DisplayOrder ?? int.MaxValue)
                     .ThenBy(x => x.DishCategory?.Name ?? "zzz")
                     .ThenBy(x => x.Name)
                     .ToList();

        var dtos = ObjectMapper.Map<List<Dish>, List<DishDto>>(items);
        for (int i = 0; i < items.Count; i++)
        {
            dtos[i].DishCategoryName = items[i].DishCategory?.Name ?? L["Uncategorized"];
        }

        return new ListResultDto<DishDto>(dtos);
    }
}

[Authorize]
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
    public virtual async Task<DishCategoryDto> GetAsync(Guid id)
    {
        var category = await _dishCategoryRepository.GetAsync(id);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(category);
    }

    /// <summary>
    /// Lấy danh sách danh mục món ăn có phân trang và sắp xếp (mặc định theo DisplayOrder ASC, Name ASC)
    /// </summary>
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
    public virtual async Task<DishCategoryDto> CreateAsync(CreateUpdateDishCategoryDto input)
    {
        var created = await _dishCategoryManager.CreateAsync(input.Name, input.Description, input.DisplayOrder);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(created);
    }

    /// <summary>
    /// Cập nhật thông tin danh mục món ăn (kiểm tra trùng tên)
    /// </summary>
    public virtual async Task<DishCategoryDto> UpdateAsync(Guid id, CreateUpdateDishCategoryDto input)
    {
        var category = await _dishCategoryRepository.GetAsync(id);
        var updated = await _dishCategoryManager.UpdateAsync(category, input.Name, input.Description, input.DisplayOrder);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(updated);
    }

    /// <summary>
    /// Xóa một danh mục món ăn (chặn xóa nếu danh mục đang được các món ăn sử dụng)
    /// </summary>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _dishCategoryManager.CheckCanDeleteAsync(id);
        await _dishCategoryRepository.DeleteAsync(id);
    }
}
