using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Reservations;

public interface ITableReservationRepository : IRepository<TableReservation, Guid>
{
    Task<TableReservation?> FindActiveByTableIdAsync(Guid tableId, CancellationToken cancellationToken = default);

    Task<List<TableReservation>> GetOverdueConfirmedReservationsAsync(DateTime cutoffTime, CancellationToken cancellationToken = default);
}
