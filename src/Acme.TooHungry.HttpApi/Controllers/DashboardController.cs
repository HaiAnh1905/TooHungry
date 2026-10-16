using System.Threading.Tasks;
using Acme.TooHungry.Dashboard;
using Acme.TooHungry.Permissions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Volo.Abp;

namespace Acme.TooHungry.Controllers;

[RemoteService]
[Route("api/app/dashboard")]
[Authorize(TooHungryPermissions.Dashboard.Default)]
public class DashboardController : TooHungryController, IDashboardAppService
{
    private readonly IDashboardAppService _dashboardAppService;

    public DashboardController(IDashboardAppService dashboardAppService)
    {
        _dashboardAppService = dashboardAppService;
    }

    [HttpGet("summary")]
    public virtual Task<DashboardSummaryDto> GetSummaryAsync([FromQuery] GetDashboardInput input)
    {
        return _dashboardAppService.GetSummaryAsync(input);
    }
}
