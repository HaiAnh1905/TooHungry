using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Acme.TooHungry.Permissions;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.DailyMenus;

[Authorize(TooHungryPermissions.Dishes.Default)]
public class DailyMenuAppService : ApplicationService, IDailyMenuAppService
{
    private readonly IRepository<DailyMenu, Guid> _dailyMenuRepository;

    public DailyMenuAppService(IRepository<DailyMenu, Guid> dailyMenuRepository)
    {
        _dailyMenuRepository = dailyMenuRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một thực đơn ngày theo Id (kèm danh sách các món trong thực đơn)
    /// </summary>
    /// <param name="id">Id thực đơn ngày</param>
    /// <returns>Thông tin thực đơn ngày dạng DTO</returns>
    public virtual async Task<DailyMenuDto> GetAsync(Guid id)
    {
        var queryable = await _dailyMenuRepository.WithDetailsAsync(x => x.Items);
        var menu = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (menu == null)
        {
            throw new EntityNotFoundException(typeof(DailyMenu), id);
        }

        return ObjectMapper.Map<DailyMenu, DailyMenuDto>(menu);
    }

    /// <summary>
    /// Lấy danh sách thực đơn ngày có phân trang, sắp xếp theo ngày áp dụng mới nhất
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách thực đơn ngày phân trang</returns>
    public virtual async Task<PagedResultDto<DailyMenuDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _dailyMenuRepository.WithDetailsAsync(x => x.Items);
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(DailyMenu.Date) + " desc" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DailyMenu>, List<DailyMenuDto>>(items);
        return new PagedResultDto<DailyMenuDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một thực đơn áp dụng theo ngày (kèm danh sách các món được chọn)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới thực đơn ngày</param>
    /// <returns>Thông tin thực đơn ngày vừa tạo</returns>
    public virtual async Task<DailyMenuDto> CreateAsync(CreateUpdateDailyMenuDto input)
    {
        var menu = ObjectMapper.Map<CreateUpdateDailyMenuDto, DailyMenu>(input);
        var inserted = await _dailyMenuRepository.InsertAsync(menu, autoSave: true);
        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin thực đơn ngày và danh sách các món ăn áp dụng
    /// </summary>
    /// <param name="id">Id thực đơn ngày cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin thực đơn ngày sau khi cập nhật</returns>
    public virtual async Task<DailyMenuDto> UpdateAsync(Guid id, CreateUpdateDailyMenuDto input)
    {
        var queryable = await _dailyMenuRepository.WithDetailsAsync(x => x.Items);
        var menu = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (menu == null)
        {
            throw new EntityNotFoundException(typeof(DailyMenu), id);
        }

        menu.Name = input.Name;
        menu.Date = input.Date;
        menu.IsActive = input.IsActive;
        menu.Note = input.Note;

        // Cập nhật danh sách items
        menu.Items.Clear();
        if (input.Items != null && input.Items.Count > 0)
        {
            foreach (var itemDto in input.Items)
            {
                var item = ObjectMapper.Map<CreateUpdateDailyMenuItemDto, DailyMenuItem>(itemDto);
                menu.Items.Add(item);
            }
        }

        await _dailyMenuRepository.UpdateAsync(menu, autoSave: true);
        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một thực đơn ngày khỏi hệ thống
    /// </summary>
    /// <param name="id">Id thực đơn ngày cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _dailyMenuRepository.DeleteAsync(id);
    }

    /// <summary>
    /// Lấy thực đơn áp dụng cho một ngày cụ thể
    /// </summary>
    /// <param name="date">Ngày cần tra cứu thực đơn</param>
    /// <returns>Thực đơn của ngày đó hoặc null nếu chưa thiết lập</returns>
    public virtual async Task<DailyMenuDto?> GetByDateAsync(DateTime date)
    {
        var targetDate = date.Date;
        var queryable = await _dailyMenuRepository.WithDetailsAsync(x => x.Items);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(
            queryable,
            x => x.Date.Date == targetDate
        );

        return entity == null ? null : ObjectMapper.Map<DailyMenu, DailyMenuDto>(entity);
    }
}
