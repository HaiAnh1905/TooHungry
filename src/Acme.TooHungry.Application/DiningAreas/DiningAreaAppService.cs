using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Tables;

namespace Acme.TooHungry.DiningAreas;

[Authorize(TooHungryPermissions.DiningAreas.Default)]
public class DiningAreaAppService : TooHungryAppService, IDiningAreaAppService
{
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableRealtimeNotifier _realtimeNotifier;

    public DiningAreaAppService(
        IRepository<DiningArea, Guid> diningAreaRepository,
        IRepository<RestaurantTable, Guid> tableRepository,
        ITableRealtimeNotifier realtimeNotifier)
    {
        _diningAreaRepository = diningAreaRepository;
        _tableRepository = tableRepository;
        _realtimeNotifier = realtimeNotifier;
    }

    /// <summary>
    /// Lấy thông tin chi tiết khu vực bàn ăn theo Id (kèm tổng số lượng bàn thuộc khu vực)
    /// </summary>
    /// <param name="id">Id của khu vực bàn ăn</param>
    /// <returns>Thông tin khu vực bàn ăn dạng DTO</returns>
    public virtual async Task<DiningAreaDto> GetAsync(Guid id)
    {
        var area = await _diningAreaRepository.GetAsync(id);
        var dto = ObjectMapper.Map<DiningArea, DiningAreaDto>(area);
        dto.TableCount = await _tableRepository.CountAsync(x => x.DiningAreaId == id || (area.Name != null && x.Location == area.Name));
        return dto;
    }

    /// <summary>
    /// Lấy danh sách các khu vực bàn ăn có phân trang, hỗ trợ tìm kiếm theo tên, mô tả và trạng thái
    /// </summary>
    /// <param name="input">Điều kiện lọc và tham số phân trang</param>
    /// <returns>Danh sách khu vực bàn ăn phân trang kèm tổng số lượng bàn của từng khu vực</returns>
    public virtual async Task<PagedResultDto<DiningAreaDto>> GetListAsync(GetDiningAreasInput input)
    {
        var queryable = await _diningAreaRepository.GetQueryableAsync();

        // Lọc theo từ khóa tìm kiếm trong Tên hoặc Mô tả
        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.Name.ToLower().Contains(filter) || (x.Description != null && x.Description.ToLower().Contains(filter)));
        }

        // Lọc theo trạng thái khả dụng nếu có truyền
        if (input.IsActive.HasValue)
        {
            queryable = queryable.Where(x => x.IsActive == input.IsActive.Value);
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(DiningArea.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DiningArea>, List<DiningAreaDto>>(items);

        // Tính toán tổng số lượng bàn ăn thuộc từng khu vực
        var tableQueryable = await _tableRepository.GetQueryableAsync();
        var allTables = await AsyncExecuter.ToListAsync(tableQueryable);

        foreach (var dto in dtos)
        {
            dto.TableCount = allTables.Count(t =>
                t.DiningAreaId == dto.Id ||
                (!string.IsNullOrEmpty(dto.Name) && !string.IsNullOrEmpty(t.Location) && t.Location.Trim().Equals(dto.Name.Trim(), StringComparison.OrdinalIgnoreCase))
            );
        }

        return new PagedResultDto<DiningAreaDto>(totalCount, dtos);
    }

    /// <summary>
    /// Lấy danh sách khu vực bàn ăn đang hoạt động cho các dropdown lựa chọn (lookup)
    /// </summary>
    /// <returns>Danh sách khu vực bàn ăn được sắp xếp theo tên</returns>
    public virtual async Task<ListResultDto<DiningAreaDto>> GetLookupAsync()
    {
        var queryable = await _diningAreaRepository.GetQueryableAsync();
        var list = await AsyncExecuter.ToListAsync(queryable.Where(x => x.IsActive).OrderBy(x => x.Name));
        var dtos = ObjectMapper.Map<List<DiningArea>, List<DiningAreaDto>>(list);

        var tableQueryable = await _tableRepository.GetQueryableAsync();
        var allTables = await AsyncExecuter.ToListAsync(tableQueryable);

        foreach (var dto in dtos)
        {
            dto.TableCount = allTables.Count(t =>
                t.DiningAreaId == dto.Id ||
                (!string.IsNullOrEmpty(dto.Name) && !string.IsNullOrEmpty(t.Location) && t.Location.Trim().Equals(dto.Name.Trim(), StringComparison.OrdinalIgnoreCase))
            );
        }

        return new ListResultDto<DiningAreaDto>(dtos);
    }

    /// <summary>
    /// Tạo mới một khu vực bàn ăn (kiểm tra trùng tên khu vực)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới khu vực</param>
    /// <returns>Thông tin khu vực bàn ăn vừa tạo</returns>
    [Authorize(TooHungryPermissions.DiningAreas.Create)]
    public virtual async Task<DiningAreaDto> CreateAsync(CreateUpdateDiningAreaDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException("Tên khu vực bàn ăn không được để trống!");
        }

        var isExist = await _diningAreaRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Khu vực bàn ăn '{cleanName}' đã tồn tại!");
        }

        var area = ObjectMapper.Map<CreateUpdateDiningAreaDto, DiningArea>(input);
        area.Name = cleanName;
        area.IsActive = input.IsActive;

        var inserted = await _diningAreaRepository.InsertAsync(area, autoSave: true);
        return ObjectMapper.Map<DiningArea, DiningAreaDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin khu vực bàn ăn
    /// </summary>
    /// <param name="id">Id khu vực bàn ăn</param>
    /// <param name="input">Dữ liệu cập nhật</param>
    /// <returns>Thông tin khu vực sau khi cập nhật</returns>
    [Authorize(TooHungryPermissions.DiningAreas.Edit)]
    public virtual async Task<DiningAreaDto> UpdateAsync(Guid id, CreateUpdateDiningAreaDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException("Tên khu vực bàn ăn không được để trống!");
        }

        var isExist = await _diningAreaRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Khu vực bàn ăn '{cleanName}' đã tồn tại!");
        }

        var area = await _diningAreaRepository.GetAsync(id);
        ObjectMapper.Map(input, area);
        area.Name = cleanName;
        area.IsActive = input.IsActive;

        await _diningAreaRepository.UpdateAsync(area, autoSave: true);
        return ObjectMapper.Map<DiningArea, DiningAreaDto>(area);
    }

    /// <summary>
    /// Vô hiệu hóa một khu vực ăn uống và chuyển toàn bộ bàn trực thuộc sang Disabled
    /// </summary>
    public virtual async Task DeactivateAsync(Guid id)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Manage) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Edit))
        {
            throw new AbpAuthorizationException("Bạn không có quyền quản lý trạng thái khu vực ăn uống!");
        }

        var area = await _diningAreaRepository.GetAsync(id);

        // Kiểm tra xem có bàn nào trong khu vực đang có khách hoặc đang mở đơn không
        var tables = await _tableRepository.GetListAsync(x => x.DiningAreaId == id);
        var activeOccupiedTables = tables.Where(t => t.Status == TableStatus.Occupied).ToList();
        if (activeOccupiedTables.Any())
        {
            throw new UserFriendlyException($"Không thể vô hiệu hóa khu vực '{area.Name}' vì có {activeOccupiedTables.Count} bàn đang có khách phục vụ!");
        }

        area.IsActive = false;
        await _diningAreaRepository.UpdateAsync(area, autoSave: true);

        // Chuyển toàn bộ bàn trong khu vực sang trạng thái Disabled
        foreach (var table in tables)
        {
            table.Status = TableStatus.Disabled;
            await _tableRepository.UpdateAsync(table, autoSave: true);
            await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, area.Id);
        }
    }

    /// <summary>
    /// Kích hoạt lại một khu vực ăn uống và đưa các bàn về Available
    /// </summary>
    public virtual async Task ActivateAsync(Guid id)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Manage) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Edit))
        {
            throw new AbpAuthorizationException("Bạn không có quyền quản lý trạng thái khu vực ăn uống!");
        }

        var area = await _diningAreaRepository.GetAsync(id);
        area.IsActive = true;
        await _diningAreaRepository.UpdateAsync(area, autoSave: true);

        var tables = await _tableRepository.GetListAsync(x => x.DiningAreaId == id);
        foreach (var table in tables)
        {
            if (table.Status == TableStatus.Disabled)
            {
                table.Status = TableStatus.Available;
                await _tableRepository.UpdateAsync(table, autoSave: true);
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, area.Id);
            }
        }
    }

    /// <summary>
    /// Xóa khu vực (Chặn xóa cứng theo quy định hiến pháp)
    /// </summary>
    [Authorize(TooHungryPermissions.DiningAreas.Delete)]
    public virtual Task DeleteAsync(Guid id)
    {
        throw new UserFriendlyException("Hệ thống không hỗ trợ xóa cứng khu vực ăn uống. Vui lòng sử dụng tính năng Vô hiệu hóa khu vực!");
    }
}
