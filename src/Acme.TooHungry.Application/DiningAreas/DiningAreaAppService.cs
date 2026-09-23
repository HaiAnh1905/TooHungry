using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Tables;

namespace Acme.TooHungry.DiningAreas;

[Authorize]
public class DiningAreaAppService : TooHungryAppService, IDiningAreaAppService
{
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;

    public DiningAreaAppService(
        IRepository<DiningArea, Guid> diningAreaRepository,
        IRepository<RestaurantTable, Guid> tableRepository)
    {
        _diningAreaRepository = diningAreaRepository;
        _tableRepository = tableRepository;
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
    /// Lấy danh sách các khu vực bàn ăn có phân trang, hỗ trợ tìm kiếm theo tên và mô tả
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

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(DiningArea.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DiningArea>, List<DiningAreaDto>>(items);

        // Tính toán tổng số lượng bàn ăn thuộc từng khu vực (dùng chung danh sách bàn để tối ưu hiệu năng)
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
    /// Lấy toàn bộ danh sách khu vực bàn ăn gọn nhẹ cho các dropdown lựa chọn (lookup)
    /// </summary>
    /// <returns>Danh sách khu vực bàn ăn được sắp xếp theo tên</returns>
    public virtual async Task<ListResultDto<DiningAreaDto>> GetLookupAsync()
    {
        var list = await _diningAreaRepository.GetListAsync();
        var dtos = ObjectMapper.Map<List<DiningArea>, List<DiningAreaDto>>(list.OrderBy(x => x.Name).ToList());

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
    public virtual async Task<DiningAreaDto> CreateAsync(CreateUpdateDiningAreaDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException("Tên khu vực bàn ăn không được để trống!");
        }

        // Guard: Kiểm tra trùng tên khu vực
        var isExist = await _diningAreaRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException(L["DiningAreaAlreadyExists", cleanName]);
        }

        var area = ObjectMapper.Map<CreateUpdateDiningAreaDto, DiningArea>(input);
        area.Name = cleanName;

        var inserted = await _diningAreaRepository.InsertAsync(area, autoSave: true);
        return ObjectMapper.Map<DiningArea, DiningAreaDto>(inserted);
    }

    /// <summary>
    /// Cập nhật thông tin khu vực bàn ăn
    /// </summary>
    /// <param name="id">Id khu vực bàn ăn</param>
    /// <param name="input">Dữ liệu cập nhật</param>
    /// <returns>Thông tin khu vực sau khi cập nhật</returns>
    public virtual async Task<DiningAreaDto> UpdateAsync(Guid id, CreateUpdateDiningAreaDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException("Tên khu vực bàn ăn không được để trống!");
        }

        // Guard: Kiểm tra trùng tên với khu vực khác
        var isExist = await _diningAreaRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException(L["DiningAreaAlreadyExists", cleanName]);
        }

        var area = await _diningAreaRepository.GetAsync(id);
        ObjectMapper.Map(input, area);
        area.Name = cleanName;

        await _diningAreaRepository.UpdateAsync(area, autoSave: true);
        return ObjectMapper.Map<DiningArea, DiningAreaDto>(area);
    }

    /// <summary>
    /// Xóa một khu vực bàn ăn khỏi hệ thống (chặn xóa nếu còn bàn ăn thuộc khu vực này)
    /// </summary>
    /// <param name="id">Id khu vực bàn ăn cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        var area = await _diningAreaRepository.FindAsync(id);
        if (area == null)
        {
            return;
        }

        // Guard: Không cho phép xóa nếu có bàn ăn đang thuộc khu vực này
        var tableCount = await _tableRepository.CountAsync(x => x.DiningAreaId == id);
        if (tableCount > 0)
        {
            throw new UserFriendlyException(L["CannotDeleteDiningAreaWithTables", area.Name, tableCount]);
        }

        await _diningAreaRepository.DeleteAsync(area);
    }
}
