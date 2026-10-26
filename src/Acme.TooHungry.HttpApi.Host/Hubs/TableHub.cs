using Microsoft.AspNetCore.Authorization;
using Volo.Abp.AspNetCore.SignalR;

namespace Acme.TooHungry.Hubs;

[Authorize]
public class TableHub : AbpHub
{
}
