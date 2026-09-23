using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Ingredients;

public class UnitAppService : ApplicationService, IUnitAppService
{
    private readonly IRepository<Unit, Guid> _unitRepository;

    public UnitAppService(IRepository<Unit, Guid> unitRepository)
    {
        _unitRepository = unitRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một đơn vị tính theo Id
    /// </summary>
    /// <param name="id">Id đơn vị tính</param>
    /// <returns>Thông tin đơn vị tính DTO</returns>
    public virtual async Task<UnitDto> GetAsync(Guid id)
    {
        var unit = await _unitRepository.GetAsync(id);
        return ObjectMapper.Map<Unit, UnitDto>(unit);
    }

    /// <summary>
    /// Lấy danh sách đơn vị tính có phân trang và sắp xếp
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách đơn vị tính phân trang</returns>
    public virtual async Task<PagedResultDto<UnitDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _unitRepository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Unit.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Unit>, List<UnitDto>>(items);
        return new PagedResultDto<UnitDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một đơn vị tính (kiểm tra trùng tên)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới đơn vị tính</param>
    /// <returns>Thông tin đơn vị tính vừa tạo</returns>
    public virtual async Task<UnitDto> CreateAsync(CreateUpdateUnitDto input)
    {
        var cleanName = input.Name.Trim();
        var isExist = await _unitRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Đơn vị tính '{cleanName}' đã tồn tại!");
        }

        var unit = ObjectMapper.Map<CreateUpdateUnitDto, Unit>(input);
        unit.Name = cleanName;

        var inserted = await _unitRepository.InsertAsync(unit, autoSave: true);
        return ObjectMapper.Map<Unit, UnitDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin một đơn vị tính
    /// </summary>
    /// <param name="id">Id đơn vị tính cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin đơn vị tính sau khi cập nhật</returns>
    public virtual async Task<UnitDto> UpdateAsync(Guid id, CreateUpdateUnitDto input)
    {
        var cleanName = input.Name.Trim();
        var isExist = await _unitRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Đơn vị tính '{cleanName}' đã tồn tại!");
        }

        var unit = await _unitRepository.GetAsync(id);
        ObjectMapper.Map(input, unit);
        unit.Name = cleanName;

        await _unitRepository.UpdateAsync(unit, autoSave: true);
        return ObjectMapper.Map<Unit, UnitDto>(unit);
    }

    /// <summary>
    /// Xóa một đơn vị tính khỏi hệ thống
    /// </summary>
    /// <param name="id">Id đơn vị tính cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _unitRepository.DeleteAsync(id);
    }
}

public class IngredientCategoryAppService : ApplicationService, IIngredientCategoryAppService
{
    private readonly IRepository<IngredientCategory, Guid> _categoryRepository;

    public IngredientCategoryAppService(IRepository<IngredientCategory, Guid> categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một danh mục nguyên liệu theo Id
    /// </summary>
    /// <param name="id">Id danh mục nguyên liệu</param>
    /// <returns>Thông tin danh mục nguyên liệu DTO</returns>
    public virtual async Task<IngredientCategoryDto> GetAsync(Guid id)
    {
        var category = await _categoryRepository.GetAsync(id);
        return ObjectMapper.Map<IngredientCategory, IngredientCategoryDto>(category);
    }

    /// <summary>
    /// Lấy danh sách danh mục nguyên liệu có phân trang và sắp xếp
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách danh mục nguyên liệu phân trang</returns>
    public virtual async Task<PagedResultDto<IngredientCategoryDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _categoryRepository.GetQueryableAsync();
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(IngredientCategory.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<IngredientCategory>, List<IngredientCategoryDto>>(items);
        return new PagedResultDto<IngredientCategoryDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một danh mục nguyên liệu (kiểm tra trùng tên)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới danh mục</param>
    /// <returns>Thông tin danh mục nguyên liệu vừa tạo</returns>
    public virtual async Task<IngredientCategoryDto> CreateAsync(CreateUpdateIngredientCategoryDto input)
    {
        var cleanName = input.Name.Trim();
        var isExist = await _categoryRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Danh mục nguyên liệu '{cleanName}' đã tồn tại!");
        }

        var category = ObjectMapper.Map<CreateUpdateIngredientCategoryDto, IngredientCategory>(input);
        category.Name = cleanName;

        var inserted = await _categoryRepository.InsertAsync(category, autoSave: true);
        return ObjectMapper.Map<IngredientCategory, IngredientCategoryDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin danh mục nguyên liệu
    /// </summary>
    /// <param name="id">Id danh mục nguyên liệu cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin danh mục nguyên liệu sau khi cập nhật</returns>
    public virtual async Task<IngredientCategoryDto> UpdateAsync(Guid id, CreateUpdateIngredientCategoryDto input)
    {
        var cleanName = input.Name.Trim();
        var isExist = await _categoryRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Danh mục nguyên liệu '{cleanName}' đã tồn tại!");
        }

        var category = await _categoryRepository.GetAsync(id);
        ObjectMapper.Map(input, category);
        category.Name = cleanName;

        await _categoryRepository.UpdateAsync(category, autoSave: true);
        return ObjectMapper.Map<IngredientCategory, IngredientCategoryDto>(category);
    }

    /// <summary>
    /// Xóa một danh mục nguyên liệu khỏi hệ thống
    /// </summary>
    /// <param name="id">Id danh mục nguyên liệu cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _categoryRepository.DeleteAsync(id);
    }
}

public class IngredientAppService : ApplicationService, IIngredientAppService
{
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;

    public IngredientAppService(IRepository<Ingredient, Guid> ingredientRepository)
    {
        _ingredientRepository = ingredientRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một nguyên liệu theo Id (kèm thông tin Đơn vị tính và Danh mục)
    /// </summary>
    /// <param name="id">Id nguyên liệu</param>
    /// <returns>Thông tin nguyên liệu chi tiết DTO</returns>
    public virtual async Task<IngredientDto> GetAsync(Guid id)
    {
        var queryable = await _ingredientRepository.WithDetailsAsync(x => x.Unit!, x => x.IngredientCategory!);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(Ingredient), id);
        }

        return ObjectMapper.Map<Ingredient, IngredientDto>(entity);
    }

    /// <summary>
    /// Lấy danh sách nguyên liệu có phân trang và sắp xếp
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách nguyên liệu phân trang</returns>
    public virtual async Task<PagedResultDto<IngredientDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _ingredientRepository.WithDetailsAsync(x => x.Unit!, x => x.IngredientCategory!);
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Ingredient.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Ingredient>, List<IngredientDto>>(items);
        return new PagedResultDto<IngredientDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một nguyên liệu (kiểm tra trùng tên)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới nguyên liệu</param>
    /// <returns>Thông tin nguyên liệu vừa tạo</returns>
    public virtual async Task<IngredientDto> CreateAsync(CreateUpdateIngredientDto input)
    {
        var cleanName = input.Name.Trim();
        var isExist = await _ingredientRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Nguyên liệu '{cleanName}' đã tồn tại!");
        }

        var ingredient = ObjectMapper.Map<CreateUpdateIngredientDto, Ingredient>(input);
        ingredient.Name = cleanName;

        var inserted = await _ingredientRepository.InsertAsync(ingredient, autoSave: true);
        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin nguyên liệu
    /// </summary>
    /// <param name="id">Id nguyên liệu cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin nguyên liệu sau khi cập nhật</returns>
    public virtual async Task<IngredientDto> UpdateAsync(Guid id, CreateUpdateIngredientDto input)
    {
        var cleanName = input.Name.Trim();
        var isExist = await _ingredientRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Nguyên liệu '{cleanName}' đã tồn tại!");
        }

        var ingredient = await _ingredientRepository.GetAsync(id);
        ObjectMapper.Map(input, ingredient);
        ingredient.Name = cleanName;

        await _ingredientRepository.UpdateAsync(ingredient, autoSave: true);
        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một nguyên liệu khỏi hệ thống
    /// </summary>
    /// <param name="id">Id nguyên liệu cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _ingredientRepository.DeleteAsync(id);
    }
}
