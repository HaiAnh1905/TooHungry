using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Orders;

public interface IOrderAppService : IApplicationService
{
    Task<OrderDto> GetAsync(Guid id);
    Task<PagedResultDto<OrderDto>> GetListAsync(PagedAndSortedResultRequestDto input);
    Task<OrderDto> CreateAsync(CreateUpdateOrderDto input);
    Task<OrderDto> UpdateAsync(Guid id, CreateUpdateOrderDto input);
    Task DeleteAsync(Guid id);
    Task<OrderDto?> GetActiveOrderByTableIdAsync(Guid tableId);
    Task CompleteActiveOrderByTableIdAsync(Guid tableId);
}
