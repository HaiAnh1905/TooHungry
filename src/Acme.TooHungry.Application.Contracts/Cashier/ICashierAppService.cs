using System.Threading.Tasks;
using Acme.TooHungry.Orders;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Cashier;

public interface ICashierAppService : IApplicationService
{
    Task<CashierShiftSummaryDto> GetShiftSummaryAsync();
    Task<ListResultDto<CashierTableDto>> GetTablesAsync(GetCashierTablesInputDto input);
    Task<PagedResultDto<OrderDto>> GetOrdersAsync(GetCashierOrdersInputDto input);
}
