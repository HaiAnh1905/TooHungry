using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Volo.Abp.Domain.Repositories.EntityFrameworkCore;
using Volo.Abp.EntityFrameworkCore;
using Acme.TooHungry.EntityFrameworkCore;

namespace Acme.TooHungry.Reservations;

public class EfCoreTableReservationRepository : EfCoreRepository<TooHungryDbContext, TableReservation, Guid>, ITableReservationRepository
{
    public EfCoreTableReservationRepository(IDbContextProvider<TooHungryDbContext> dbContextProvider)
        : base(dbContextProvider)
    {
    }

    public async Task<TableReservation?> FindActiveByTableIdAsync(Guid tableId, CancellationToken cancellationToken = default)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet
            .Where(x => x.TableId == tableId && x.Status == ReservationStatus.Confirmed)
            .OrderByDescending(x => x.ReservationTime)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<List<TableReservation>> GetOverdueConfirmedReservationsAsync(DateTime cutoffTime, CancellationToken cancellationToken = default)
    {
        var dbSet = await GetDbSetAsync();
        return await dbSet
            .Where(x => x.Status == ReservationStatus.Confirmed && x.ReservationTime < cutoffTime)
            .ToListAsync(cancellationToken);
    }
}
