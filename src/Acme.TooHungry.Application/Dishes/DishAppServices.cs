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

[Authorize(TooHungryPermissions.Dishes.Default)]
public class DishAppService : ApplicationService, IDishAppService
{
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<DishCategory, Guid> _dishCategoryRepository;

    public DishAppService(
        IRepository<Dish, Guid> dishRepository,
        IRepository<DishCategory, Guid> dishCategoryRepository)
    {
        _dishRepository = dishRepository;
        _dishCategoryRepository = dishCategoryRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một món ăn theo Id (kèm tên danh mục hiển thị)
    /// </summary>
    /// <param name="id">Id của món ăn</param>
    /// <returns>Thông tin món ăn DTO</returns>
    public virtual async Task<DishDto> GetAsync(Guid id)
    {
        // 1. Lấy dữ liệu món ăn theo Id
        var dish = await _dishRepository.GetAsync(id);

        // 2. Chuyển đổi từ Entity sang DTO
        var dto = ObjectMapper.Map<Dish, DishDto>(dish);

        // 3. Xử lý bổ sung: nếu có danh mục thì lấy thêm tên danh mục hiển thị
        if (dish.DishCategoryId.HasValue && string.IsNullOrEmpty(dto.DishCategoryName))
        {
            var category = await _dishCategoryRepository.FindAsync(dish.DishCategoryId.Value);
            dto.DishCategoryName = category?.Name;
        }

        return dto;
    }

    /// <summary>
    /// Tạo mới một món ăn vào thực đơn nhà hàng (kiểm tra trùng tên món)
    /// </summary>
    /// <param name="input">Thông tin món ăn cần tạo</param>
    /// <returns>Thông tin món ăn vừa tạo</returns>
    [Authorize(TooHungryPermissions.Dishes.Create)]
    public virtual async Task<DishDto> CreateAsync(CreateUpdateDishDto input)
    {
        // 1. Chuẩn hóa dữ liệu đầu vào (cắt khoảng trắng thừa)
        var cleanName = input.Name.Trim();

        // 2. Kiểm tra nghiệp vụ (check trùng tên món ăn)
        var isExist = await _dishRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Món ăn '{cleanName}' đã tồn tại trong thực đơn!");
        }

        // 3. Tạo Entity mới
        var newDish = new Dish
        {
            Name = cleanName,
            Description = input.Description?.Trim(),
            Price = input.Price,
            ImageUrl = input.ImageUrl?.Trim(),
            DishCategoryId = input.DishCategoryId
        };

        // 4. Lưu vào cơ sở dữ liệu
        var insertedDish = await _dishRepository.InsertAsync(newDish, autoSave: true);

        // 5. Map ngược lại trả về DTO
        return ObjectMapper.Map<Dish, DishDto>(insertedDish);
    }

    /// <summary>
    /// Lấy danh sách món ăn có phân trang và bộ lọc (theo từ khóa và danh mục món ăn)
    /// </summary>
    /// <param name="input">Điều kiện lọc, danh mục và tham số phân trang</param>
    /// <returns>Danh sách món ăn phân trang</returns>
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

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Dish.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Dish>, List<DishDto>>(items);
        return new PagedResultDto<DishDto>(totalCount, dtos);
    }

    /// <summary>
    /// Cập nhật thông tin một món ăn trong thực đơn
    /// </summary>
    /// <param name="id">Id của món ăn cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật món ăn</param>
    /// <returns>Thông tin món ăn sau khi cập nhật</returns>
    [Authorize(TooHungryPermissions.Dishes.Edit)]
    public virtual async Task<DishDto> UpdateAsync(Guid id, CreateUpdateDishDto input)
    {
        // 1. Chuẩn hóa dữ liệu đầu vào
        var cleanName = input.Name.Trim();

        // 2. Kiểm tra nghiệp vụ: kiểm tra xem có món ăn KHÁC (khác id hiện tại) bị trùng tên không
        var isExist = await _dishRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Món ăn '{cleanName}' đã tồn tại trong thực đơn!");
        }

        // 3. Lấy món ăn hiện tại cần cập nhật
        var dish = await _dishRepository.GetAsync(id);

        dish.Name = cleanName;
        dish.Description = input.Description?.Trim();
        dish.Price = input.Price;
        dish.ImageUrl = input.ImageUrl?.Trim();
        dish.DishCategoryId = input.DishCategoryId;

        // 4. Lưu cập nhật vào cơ sở dữ liệu
        await _dishRepository.UpdateAsync(dish, autoSave: true);
        return ObjectMapper.Map<Dish, DishDto>(dish);
    }

    /// <summary>
    /// Xóa một món ăn khỏi thực đơn nhà hàng
    /// </summary>
    /// <param name="id">Id của món ăn cần xóa</param>
    [Authorize(TooHungryPermissions.Dishes.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        await _dishRepository.DeleteAsync(id);
    }
}

[Authorize]
public class DishCategoryAppService : TooHungryAppService, IDishCategoryAppService
{
    private readonly IRepository<DishCategory, Guid> _dishCategoryRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;

    public DishCategoryAppService(
        IRepository<DishCategory, Guid> dishCategoryRepository,
        IRepository<Dish, Guid> dishRepository)
    {
        _dishCategoryRepository = dishCategoryRepository;
        _dishRepository = dishRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một danh mục món ăn theo Id
    /// </summary>
    /// <param name="id">Id danh mục món ăn</param>
    /// <returns>Thông tin danh mục món ăn DTO</returns>
    public virtual async Task<DishCategoryDto> GetAsync(Guid id)
    {
        var category = await _dishCategoryRepository.GetAsync(id);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(category);
    }

    /// <summary>
    /// Lấy danh sách danh mục món ăn có phân trang và sắp xếp
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách danh mục món ăn phân trang</returns>
    public virtual async Task<PagedResultDto<DishCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _dishCategoryRepository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(DishCategory.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DishCategory>, List<DishCategoryDto>>(items);
        return new PagedResultDto<DishCategoryDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một danh mục món ăn (kiểm tra trùng tên)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới danh mục</param>
    /// <returns>Thông tin danh mục vừa tạo</returns>
    public virtual async Task<DishCategoryDto> CreateAsync(CreateUpdateDishCategoryDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException(L["CategoryNameNotEmpty"]);
        }

        // Guard 1: Kiểm tra trùng tên danh mục
        var isExist = await _dishCategoryRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException(L["CategoryAlreadyExists", cleanName]);
        }

        var category = ObjectMapper.Map<CreateUpdateDishCategoryDto, DishCategory>(input);
        category.Name = cleanName;

        var inserted = await _dishCategoryRepository.InsertAsync(category, autoSave: true);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin danh mục món ăn
    /// </summary>
    /// <param name="id">Id danh mục món ăn</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin danh mục sau khi cập nhật</returns>
    public virtual async Task<DishCategoryDto> UpdateAsync(Guid id, CreateUpdateDishCategoryDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException(L["CategoryNameNotEmpty"]);
        }

        // Guard 1: Kiểm tra trùng tên với danh mục khác
        var isExist = await _dishCategoryRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException(L["CategoryAlreadyExists", cleanName]);
        }

        var category = await _dishCategoryRepository.GetAsync(id);
        ObjectMapper.Map(input, category);
        category.Name = cleanName;

        await _dishCategoryRepository.UpdateAsync(category, autoSave: true);
        return ObjectMapper.Map<DishCategory, DishCategoryDto>(category);
    }

    /// <summary>
    /// Xóa một danh mục món ăn (chặn xóa nếu danh mục đang được các món ăn sử dụng)
    /// </summary>
    /// <param name="id">Id danh mục món ăn cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        var category = await _dishCategoryRepository.FindAsync(id);
        if (category == null)
        {
            return;
        }

        // Guard 2: Không cho phép xóa nếu danh mục đang được món ăn (Dish) sử dụng
        var dishCount = await _dishRepository.CountAsync(x => x.DishCategoryId == id);
        if (dishCount > 0)
        {
            throw new UserFriendlyException(L["CategoryInUseCannotDelete", category.Name, dishCount]);
        }

        await _dishCategoryRepository.DeleteAsync(category);
    }
}

[Authorize]
public class RecipeAppService : ApplicationService, IRecipeAppService
{
    private readonly IRepository<Recipe, Guid> _recipeRepository;

    public RecipeAppService(IRepository<Recipe, Guid> recipeRepository)
    {
        _recipeRepository = recipeRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một công thức chế biến theo Id (kèm thông tin món ăn và nguyên liệu chi tiết)
    /// </summary>
    /// <param name="id">Id công thức</param>
    /// <returns>Thông tin công thức chi tiết DTO</returns>
    public virtual async Task<RecipeDto> GetAsync(Guid id)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Dish!, x => x.RecipeIngredients);
        var recipe = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (recipe == null)
        {
            throw new EntityNotFoundException(typeof(Recipe), id);
        }

        return ObjectMapper.Map<Recipe, RecipeDto>(recipe);
    }

    /// <summary>
    /// Lấy danh sách công thức chế biến có phân trang
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách công thức phân trang</returns>
    public virtual async Task<PagedResultDto<RecipeDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.Dish!);
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Recipe.Id) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Recipe>, List<RecipeDto>>(items);
        return new PagedResultDto<RecipeDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một công thức chế biến cho món ăn
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới công thức</param>
    /// <returns>Thông tin công thức vừa tạo</returns>
    public virtual async Task<RecipeDto> CreateAsync(CreateUpdateRecipeDto input)
    {
        var recipe = new Recipe(GuidGenerator.Create())
        {
            DishId = input.DishId,
            Name = input.Name,
            Description = input.Description,
            Instructions = input.Instructions
        };

        if (input.RecipeIngredients != null && input.RecipeIngredients.Count > 0)
        {
            foreach (var itemDto in input.RecipeIngredients)
            {
                var ingredient = new RecipeIngredient(GuidGenerator.Create())
                {
                    RecipeId = recipe.Id,
                    IngredientId = itemDto.IngredientId,
                    Quantity = itemDto.Quantity,
                    Note = itemDto.Note
                };
                recipe.RecipeIngredients.Add(ingredient);
            }
        }

        var inserted = await _recipeRepository.InsertAsync(recipe, autoSave: true);
        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin công thức chế biến
    /// </summary>
    /// <param name="id">Id công thức cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin công thức sau khi cập nhật</returns>
    public virtual async Task<RecipeDto> UpdateAsync(Guid id, CreateUpdateRecipeDto input)
    {
        var queryable = await _recipeRepository.WithDetailsAsync(x => x.RecipeIngredients, x => x.Dish!);
        var recipe = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (recipe == null)
        {
            throw new EntityNotFoundException(typeof(Recipe), id);
        }

        recipe.DishId = input.DishId;
        recipe.Name = input.Name;
        recipe.Description = input.Description;
        recipe.Instructions = input.Instructions;

        recipe.RecipeIngredients.Clear();
        if (input.RecipeIngredients != null && input.RecipeIngredients.Count > 0)
        {
            foreach (var itemDto in input.RecipeIngredients)
            {
                var ingredient = new RecipeIngredient(GuidGenerator.Create())
                {
                    RecipeId = recipe.Id,
                    IngredientId = itemDto.IngredientId,
                    Quantity = itemDto.Quantity,
                    Note = itemDto.Note
                };
                recipe.RecipeIngredients.Add(ingredient);
            }
        }

        await _recipeRepository.UpdateAsync(recipe, autoSave: true);
        return await GetAsync(recipe.Id);
    }

    /// <summary>
    /// Xóa một công thức chế biến khỏi hệ thống
    /// </summary>
    /// <param name="id">Id công thức cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _recipeRepository.DeleteAsync(id);
    }
}
