using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Acme.TooHungry.Tables;
using Volo.Abp.BackgroundWorkers;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Threading;
using Volo.Abp.Timing;

namespace Acme.TooHungry.Reservations;

public class ReservationAutoCancelBackgroundWorker : AsyncPeriodicBackgroundWorkerBase
{
    public ReservationAutoCancelBackgroundWorker(
        AbpAsyncTimer timer,
        IServiceScopeFactory serviceScopeFactory)
        : base(timer, serviceScopeFactory)
    {
        Timer.Period = 300000; // 5 phút (300,000 ms)
    }

    protected override async Task DoWorkAsync(PeriodicBackgroundWorkerContext workerContext)
    {
        Logger.LogInformation("ReservationAutoCancelBackgroundWorker scanning for overdue confirmed reservations...");
        await ProcessOverdueReservationsAsync(workerContext.ServiceProvider);
    }

    public virtual async Task ProcessOverdueReservationsAsync(IServiceProvider serviceProvider)
    {
        var clock = serviceProvider.GetRequiredService<IClock>();
        var reservationRepository = serviceProvider.GetRequiredService<ITableReservationRepository>();
        var tableRepository = serviceProvider.GetRequiredService<IRepository<RestaurantTable, Guid>>();
        var realtimeNotifier = serviceProvider.GetRequiredService<ITableRealtimeNotifier>();

        var cutoffTime = clock.Now.AddHours(-1);
        var overdueReservations = await reservationRepository.GetOverdueConfirmedReservationsAsync(cutoffTime);

        if (overdueReservations.Count == 0)
        {
            return;
        }

        Logger.LogInformation("Found {Count} overdue reservations to auto-cancel.", overdueReservations.Count);

        foreach (var reservation in overdueReservations)
        {
            reservation.Status = ReservationStatus.AutoCancelled;
            await reservationRepository.UpdateAsync(reservation, autoSave: true);

            var table = await tableRepository.FindAsync(reservation.TableId);
            if (table != null && table.Status == TableStatus.Reserved)
            {
                table.Status = TableStatus.Available;
                table.ReservedCustomerName = null;
                table.ReservedCustomerPhone = null;
                table.ReservedTime = null;
                table.ReservedGuestCount = null;
                table.ReservedNote = null;
                await tableRepository.UpdateAsync(table, autoSave: true);

                await realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId);
            }
        }
    }
}
