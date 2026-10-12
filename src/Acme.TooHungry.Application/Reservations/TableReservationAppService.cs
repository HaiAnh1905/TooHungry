using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Tables;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Reservations;

[RemoteService(IsEnabled = false)]
[Authorize(TooHungryPermissions.Reservations.Default)]
public class TableReservationAppService : ApplicationService, ITableReservationAppService
{
    private readonly ITableReservationRepository _reservationRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly TableReservationManager _reservationManager;
    private readonly ITableRealtimeNotifier _realtimeNotifier;

    public TableReservationAppService(
        ITableReservationRepository reservationRepository,
        IRepository<RestaurantTable, Guid> tableRepository,
        TableReservationManager reservationManager,
        ITableRealtimeNotifier realtimeNotifier)
    {
        _reservationRepository = reservationRepository;
        _tableRepository = tableRepository;
        _reservationManager = reservationManager;
        _realtimeNotifier = realtimeNotifier;
    }

    [Authorize(TooHungryPermissions.Reservations.Create)]
    public virtual async Task<TableReservationDto> CreateAsync(CreateTableReservationDto input)
    {
        var (reservation, table) = await _reservationManager.CreateReservationAsync(
            input.TableId,
            input.CustomerName,
            input.CustomerPhone,
            input.ReservationTime,
            input.GuestCount,
            input.Note
        );

        await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId);

        var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(reservation);
        dto.TableName = table.Name;
        return dto;
    }

    public virtual async Task<TableReservationDto> GetAsync(Guid id)
    {
        var queryable = await _reservationRepository.WithDetailsAsync(x => x.Table);
        var reservation = await AsyncExecuter.FirstOrDefaultAsync(queryable.Where(x => x.Id == id));
        if (reservation == null)
        {
            reservation = await _reservationRepository.GetAsync(id);
        }

        var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(reservation);
        if (reservation.Table != null)
        {
            dto.TableName = reservation.Table.Name;
        }
        else
        {
            var table = await _tableRepository.FindAsync(reservation.TableId);
            dto.TableName = table?.Name ?? string.Empty;
        }
        return dto;
    }

    public virtual async Task<TableReservationDto?> GetActiveByTableIdAsync(Guid tableId)
    {
        var reservation = await _reservationRepository.FindActiveByTableIdAsync(tableId);
        if (reservation == null)
        {
            return null;
        }

        var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(reservation);
        if (reservation.Table != null)
        {
            dto.TableName = reservation.Table.Name;
        }
        else
        {
            var table = await _tableRepository.FindAsync(tableId);
            dto.TableName = table?.Name ?? string.Empty;
        }
        return dto;
    }

    [Authorize(TooHungryPermissions.Reservations.Update)]
    public virtual async Task<TableReservationDto> UpdateAsync(Guid id, UpdateTableReservationDto input)
    {
        var (reservation, table) = await _reservationManager.UpdateReservationAsync(
            id,
            input.CustomerName,
            input.CustomerPhone,
            input.ReservationTime,
            input.GuestCount,
            input.Note
        );

        await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId);

        var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(reservation);
        dto.TableName = table.Name;
        return dto;
    }

    [Authorize(TooHungryPermissions.Reservations.CheckIn)]
    public virtual async Task<TableReservationDto> CheckInAsync(Guid id)
    {
        var (reservation, table) = await _reservationManager.CheckInAsync(id);

        await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId);

        var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(reservation);
        dto.TableName = table.Name;
        return dto;
    }

    [Authorize(TooHungryPermissions.Reservations.Cancel)]
    public virtual async Task<TableReservationDto> CancelAsync(Guid id)
    {
        var (reservation, table) = await _reservationManager.CancelAsync(id);

        await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId);

        var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(reservation);
        dto.TableName = table.Name;
        return dto;
    }

    public virtual async Task<PagedResultDto<TableReservationDto>> GetListAsync(GetTableReservationsInput input)
    {
        var queryable = await _reservationRepository.WithDetailsAsync(x => x.Table);

        if (input.TableId.HasValue)
        {
            queryable = queryable.Where(x => x.TableId == input.TableId.Value);
        }

        if (input.Status.HasValue)
        {
            queryable = queryable.Where(x => x.Status == input.Status.Value);
        }

        if (input.FromDate.HasValue)
        {
            queryable = queryable.Where(x => x.ReservationTime >= input.FromDate.Value);
        }

        if (input.ToDate.HasValue)
        {
            queryable = queryable.Where(x => x.ReservationTime <= input.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x =>
                x.CustomerName.ToLower().Contains(filter) ||
                x.CustomerPhone.ToLower().Contains(filter) ||
                (x.Note != null && x.Note.ToLower().Contains(filter)));
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? $"{nameof(TableReservation.ReservationTime)} DESC" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = items.Select(r =>
        {
            var dto = ObjectMapper.Map<TableReservation, TableReservationDto>(r);
            if (r.Table != null)
            {
                dto.TableName = r.Table.Name;
            }
            return dto;
        }).ToList();

        return new PagedResultDto<TableReservationDto>(totalCount, dtos);
    }
}
