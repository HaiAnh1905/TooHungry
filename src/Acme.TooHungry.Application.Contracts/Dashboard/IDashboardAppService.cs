using System.Threading.Tasks;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Dashboard;

public interface IDashboardAppService : IApplicationService
{
    Task<DashboardSummaryDto> GetSummaryAsync(GetDashboardInput input);
}
