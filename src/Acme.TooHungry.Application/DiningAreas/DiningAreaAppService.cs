using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Auditing;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Tables;

namespace Acme.TooHungry.DiningAreas;

[Authorize(TooHungryPermissions.DiningAreas.Default)]
public class DiningAreaAppService : ApplicationService, IDiningAreaAppService
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

    /// <inheritdoc />
    [DisableAuditing]
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

        // Tính toán tổng số lượng bàn ăn thuộc từng khu vực bằng GroupBy trực tiếp trên cơ sở dữ liệu
        if (dtos.Count > 0)
        {
            var areaIds = dtos.Select(x => (Guid?)x.Id).ToList();
            var tableQueryable = await _tableRepository.GetQueryableAsync();
            var counts = await AsyncExecuter.ToListAsync(
                tableQueryable
                    .Where(t => t.DiningAreaId != null && areaIds.Contains(t.DiningAreaId))
                    .GroupBy(t => t.DiningAreaId)
                    .Select(g => new { DiningAreaId = g.Key!.Value, Count = g.Count() })
            );
            var countMap = counts.ToDictionary(x => x.DiningAreaId, x => x.Count);

            foreach (var dto in dtos)
            {
                dto.TableCount = countMap.GetValueOrDefault(dto.Id, 0);
            }
        }

        return new PagedResultDto<DiningAreaDto>(totalCount, dtos);
    }

    /// <inheritdoc />
    public virtual async Task<DiningAreaDto> GetAsync(Guid id)
    {
        var area = await _diningAreaRepository.FindAsync(id);
        if (area == null)
        {
            throw DiningAreaValidationException.NotFound(id);
        }

        var dto = ObjectMapper.Map<DiningArea, DiningAreaDto>(area);
        dto.TableCount = await _tableRepository.CountAsync(x => x.DiningAreaId == id);
        return dto;
    }

    /// <inheritdoc />
    public virtual async Task<ListResultDto<DiningAreaDto>> GetLookupAsync()
    {
        var queryable = await _diningAreaRepository.GetQueryableAsync();
        var list = await AsyncExecuter.ToListAsync(queryable.Where(x => x.IsActive).OrderBy(x => x.Name));
        var dtos = ObjectMapper.Map<List<DiningArea>, List<DiningAreaDto>>(list);

        if (dtos.Count > 0)
        {
            var areaIds = dtos.Select(x => (Guid?)x.Id).ToList();
            var tableQueryable = await _tableRepository.GetQueryableAsync();
            var counts = await AsyncExecuter.ToListAsync(
                tableQueryable
                    .Where(t => t.DiningAreaId != null && areaIds.Contains(t.DiningAreaId))
                    .GroupBy(t => t.DiningAreaId)
                    .Select(g => new { DiningAreaId = g.Key!.Value, Count = g.Count() })
            );
            var countMap = counts.ToDictionary(x => x.DiningAreaId, x => x.Count);

            foreach (var dto in dtos)
            {
                dto.TableCount = countMap.GetValueOrDefault(dto.Id, 0);
            }
        }

        return new ListResultDto<DiningAreaDto>(dtos);
    }

    /// <inheritdoc />
    [Authorize(TooHungryPermissions.DiningAreas.Create)]
    public virtual async Task<DiningAreaDto> CreateAsync(CreateUpdateDiningAreaDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw DiningAreaValidationException.NameRequired();
        }

        var isExist = await _diningAreaRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw DiningAreaValidationException.NameAlreadyExists(cleanName);
        }

        var area = ObjectMapper.Map<CreateUpdateDiningAreaDto, DiningArea>(input);
        area.Name = cleanName;
        area.IsActive = input.IsActive;

        var inserted = await _diningAreaRepository.InsertAsync(area, autoSave: true);
        return ObjectMapper.Map<DiningArea, DiningAreaDto>(inserted);
    }

    /// <inheritdoc />
    [Authorize(TooHungryPermissions.DiningAreas.Edit)]
    public virtual async Task<DiningAreaDto> UpdateAsync(Guid id, CreateUpdateDiningAreaDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw DiningAreaValidationException.NameRequired();
        }

        var isExist = await _diningAreaRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw DiningAreaValidationException.NameAlreadyExists(cleanName);
        }

        var area = await _diningAreaRepository.FindAsync(id);
        if (area == null)
        {
            throw DiningAreaValidationException.NotFound(id);
        }

        ObjectMapper.Map(input, area);
        area.Name = cleanName;
        area.IsActive = input.IsActive;

        await _diningAreaRepository.UpdateAsync(area, autoSave: true);
        return ObjectMapper.Map<DiningArea, DiningAreaDto>(area);
    }

    /// <inheritdoc />
    public virtual async Task DeactivateAsync(Guid id)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Manage) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Edit))
        {
            throw DiningAreaValidationException.UnauthorizedManage();
        }

        var area = await _diningAreaRepository.FindAsync(id);
        if (area == null)
        {
            throw DiningAreaValidationException.NotFound(id);
        }

        // Kiểm tra xem có bàn nào trong khu vực đang có khách hoặc đang được đặt trước không
        var tables = await _tableRepository.GetListAsync(x => x.DiningAreaId == id);
        var activeTables = tables.Where(t => t.Status == TableStatus.Occupied || t.Status == TableStatus.Reserved).ToList();
        if (activeTables.Any())
        {
            throw DiningAreaValidationException.HasActiveOccupiedTables(area.Name, activeTables.Count);
        }

        area.IsActive = false;
        await _diningAreaRepository.UpdateAsync(area, autoSave: true);

        // Chuyển toàn bộ bàn trong khu vực sang trạng thái Disabled
        if (tables.Count > 0)
        {
            foreach (var table in tables)
            {
                table.Status = TableStatus.Disabled;
            }
            await _tableRepository.UpdateManyAsync(tables, autoSave: true);

            foreach (var table in tables)
            {
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, area.Id);
            }
        }
    }

    /// <inheritdoc />
    public virtual async Task ActivateAsync(Guid id)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Manage) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.DiningAreas.Edit))
        {
            throw DiningAreaValidationException.UnauthorizedManage();
        }

        var area = await _diningAreaRepository.FindAsync(id);
        if (area == null)
        {
            throw DiningAreaValidationException.NotFound(id);
        }

        area.IsActive = true;
        await _diningAreaRepository.UpdateAsync(area, autoSave: true);

        var tables = await _tableRepository.GetListAsync(x => x.DiningAreaId == id);
        var disabledTables = tables.Where(t => t.Status == TableStatus.Disabled).ToList();
        if (disabledTables.Count > 0)
        {
            foreach (var table in disabledTables)
            {
                table.Status = TableStatus.Available;
            }
            await _tableRepository.UpdateManyAsync(disabledTables, autoSave: true);

            foreach (var table in disabledTables)
            {
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, area.Id);
            }
        }
    }

    /// <inheritdoc />
    [Authorize(TooHungryPermissions.DiningAreas.Delete)]
    public virtual Task DeleteAsync(Guid id)
    {
        throw DiningAreaValidationException.HardDeleteNotSupported();
    }
}
