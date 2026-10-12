using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Forecasts;

public class DemandForecastAppService : ApplicationService, IDemandForecastAppService
{
    private readonly IRepository<DemandForecast, Guid> _demandForecastRepository;

    public DemandForecastAppService(IRepository<DemandForecast, Guid> demandForecastRepository)
    {
        _demandForecastRepository = demandForecastRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một bản dự báo nhu cầu theo Id (kèm danh sách món dự báo)
    /// </summary>
    /// <param name="id">Id bản dự báo</param>
    /// <returns>Thông tin bản dự báo nhu cầu DTO</returns>
    public virtual async Task<DemandForecastDto> GetAsync(Guid id)
    {
        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(DemandForecast), id);
        }

        return ObjectMapper.Map<DemandForecast, DemandForecastDto>(entity);
    }

    /// <summary>
    /// Lấy danh sách các bản dự báo nhu cầu có phân trang
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách bản dự báo nhu cầu phân trang</returns>
    public virtual async Task<PagedResultDto<DemandForecastDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(DemandForecast.ForecastDate) + " desc" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<DemandForecast>, List<DemandForecastDto>>(items);
        return new PagedResultDto<DemandForecastDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một bản dự báo nhu cầu món ăn
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới bản dự báo</param>
    /// <returns>Thông tin bản dự báo vừa tạo</returns>
    public virtual async Task<DemandForecastDto> CreateAsync(CreateUpdateDemandForecastDto input)
    {
        var entity = ObjectMapper.Map<CreateUpdateDemandForecastDto, DemandForecast>(input);
        var inserted = await _demandForecastRepository.InsertAsync(entity, autoSave: true);
        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin bản dự báo nhu cầu và danh sách món dự báo
    /// </summary>
    /// <param name="id">Id bản dự báo cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin bản dự báo sau khi cập nhật</returns>
    public virtual async Task<DemandForecastDto> UpdateAsync(Guid id, CreateUpdateDemandForecastDto input)
    {
        var queryable = await _demandForecastRepository.WithDetailsAsync(x => x.Items);
        var entity = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (entity == null)
        {
            throw new EntityNotFoundException(typeof(DemandForecast), id);
        }

        entity.ForecastDate = input.ForecastDate;
        entity.StartDate = input.StartDate;
        entity.EndDate = input.EndDate;
        entity.Note = input.Note;

        entity.Items.Clear();
        if (input.Items != null && input.Items.Count > 0)
        {
            foreach (var itemDto in input.Items)
            {
                var item = ObjectMapper.Map<CreateUpdateDemandForecastItemDto, DemandForecastItem>(itemDto);
                entity.Items.Add(item);
            }
        }

        await _demandForecastRepository.UpdateAsync(entity, autoSave: true);
        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một bản dự báo nhu cầu khỏi hệ thống
    /// </summary>
    /// <param name="id">Id bản dự báo cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _demandForecastRepository.DeleteAsync(id);
    }
}
