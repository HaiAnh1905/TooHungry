using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Permissions;

namespace Acme.TooHungry.Units;

[Authorize(TooHungryPermissions.Units.Default)]
public class UnitAppService : ApplicationService, IUnitAppService
{
    private readonly IRepository<Unit, Guid> _unitRepository;
    private readonly UnitManager _unitManager;

    public UnitAppService(
        IRepository<Unit, Guid> unitRepository,
        UnitManager unitManager)
    {
        _unitRepository = unitRepository;
        _unitManager = unitManager;
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
    [Authorize(TooHungryPermissions.Units.Create)]
    public virtual async Task<UnitDto> CreateAsync(CreateUpdateUnitDto input)
    {
        var unit = await _unitManager.CreateAsync(input.Name, input.Abbreviation, input.IsActive);
        var inserted = await _unitRepository.InsertAsync(unit, autoSave: true);
        return ObjectMapper.Map<Unit, UnitDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin một đơn vị tính
    /// </summary>
    /// <param name="id">Id đơn vị tính cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin đơn vị tính sau khi cập nhật</returns>
    [Authorize(TooHungryPermissions.Units.Edit)]
    public virtual async Task<UnitDto> UpdateAsync(Guid id, CreateUpdateUnitDto input)
    {
        var unit = await _unitRepository.GetAsync(id);
        await _unitManager.UpdateAsync(unit, input.Name, input.Abbreviation, input.IsActive);
        await _unitRepository.UpdateAsync(unit, autoSave: true);
        return ObjectMapper.Map<Unit, UnitDto>(unit);
    }

    /// <summary>
    /// Xóa một đơn vị tính khỏi hệ thống
    /// </summary>
    /// <param name="id">Id đơn vị tính cần xóa</param>
    [Authorize(TooHungryPermissions.Units.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        await _unitManager.CheckCanDeleteAsync(id);
        await _unitRepository.DeleteAsync(id);
    }
}
