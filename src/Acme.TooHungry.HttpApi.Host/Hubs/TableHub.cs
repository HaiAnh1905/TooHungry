using Microsoft.AspNetCore.Authorization;
using Volo.Abp.AspNetCore.SignalR;

namespace Acme.TooHungry.Hubs;

[HubRoute("/signalr-hubs/table")]
[Authorize]
public class TableHub : AbpHub
{
}
