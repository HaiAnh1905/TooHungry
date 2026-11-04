using Acme.TooHungry.Reservations;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;
using Acme.TooHungry.Tables;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Acme.TooHungry.Cashier;

[RemoteService(IsEnabled = false)]
[Authorize(TooHungryPermissions.Cashier.Default)]
public class CashierAppService : TooHungryAppService, ICashierAppService
{
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<TableReservation, Guid> _reservationRepository;

    public CashierAppService(
        IRepository<RestaurantTable, Guid> tableRepository,
        IRepository<Order, Guid> orderRepository,
        IRepository<Dish, Guid> dishRepository,
        IRepository<TableReservation, Guid> reservationRepository)
    {
        _tableRepository = tableRepository;
        _orderRepository = orderRepository;
        _dishRepository = dishRepository;
        _reservationRepository = reservationRepository;
    }

    public virtual async Task<CashierShiftSummaryDto> GetShiftSummaryAsync()
    {
        var today = Clock.Now.Date;

        var orderQuery = await _orderRepository.GetQueryableAsync();
        var completedOrdersToday = await AsyncExecuter.ToListAsync(
            orderQuery.Where(o => o.Status == OrderStatus.Completed && (o.OrderDate >= today || o.CreationTime >= today))
        );

        var totalRevenue = completedOrdersToday.Sum(o => o.TotalAmount);

        var activeOrders = await AsyncExecuter.ToListAsync(
            orderQuery.Where(o => o.Status == OrderStatus.Pending || o.Status == OrderStatus.Processing)
        );

        var tableQuery = await _tableRepository.GetQueryableAsync();
        var activeTableCount = await AsyncExecuter.CountAsync(
            tableQuery.Where(t => t.Status == TableStatus.Occupied)
        );

        var billRequestedCount = activeOrders.Count(o => !string.IsNullOrEmpty(o.Note) && o.Note.Contains("[Yêu cầu tính tiền]"));

        return new CashierShiftSummaryDto
        {
            CashierName = CurrentUser.Name ?? CurrentUser.UserName ?? "Mai Thu Ngân",
            ShiftStartTime = Clock.Now.Date.AddHours(7),
            TotalRevenue = totalRevenue,
            ActiveTableCount = activeTableCount,
            PendingOrderCount = activeOrders.Count,
            BillRequestedCount = billRequestedCount
        };
    }

    public virtual async Task<ListResultDto<CashierTableDto>> GetTablesAsync(GetCashierTablesInputDto input)
    {
        var tableQueryable = await _tableRepository.WithDetailsAsync(x => x.DiningArea!);

        if (input.DiningAreaId.HasValue)
        {
            tableQueryable = tableQueryable.Where(x => x.DiningAreaId == input.DiningAreaId.Value);
        }

        if (input.Status.HasValue)
        {
            tableQueryable = tableQueryable.Where(x => x.Status == input.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(input.SearchKeyword))
        {
            var keyword = input.SearchKeyword.Trim().ToLower();
            tableQueryable = tableQueryable.Where(x => x.Name.ToLower().Contains(keyword));
        }

        var tables = await AsyncExecuter.ToListAsync(tableQueryable.OrderBy(x => x.Name));

        // Tải các active orders
        var tableIds = tables.Select(t => t.Id).ToList();
        var orderQueryable = await _orderRepository.WithDetailsAsync(x => x.Items);
        var activeOrders = await AsyncExecuter.ToListAsync(
            orderQueryable.Where(o => o.TableId.HasValue && tableIds.Contains(o.TableId.Value) && o.Status != OrderStatus.Completed && o.Status != OrderStatus.Cancelled)
        );

        var activeOrderDict = activeOrders.GroupBy(o => o.TableId!.Value).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.CreationTime).First());

        var resQueryable = await _reservationRepository.GetQueryableAsync();
        var activeReservations = await AsyncExecuter.ToListAsync(
            resQueryable.Where(r => tableIds.Contains(r.TableId) && r.Status == ReservationStatus.Confirmed)
        );
        var activeResDict = activeReservations.GroupBy(r => r.TableId).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.ReservationTime).First());

        var result = new List<CashierTableDto>();
        foreach (var table in tables)
        {
            activeOrderDict.TryGetValue(table.Id, out var activeOrder);

            int? occupiedMinutes = null;
            if (table.OccupiedTime.HasValue)
            {
                occupiedMinutes = (int)Math.Max(0, (Clock.Now - table.OccupiedTime.Value).TotalMinutes);
            }

            var isBillRequested = activeOrder != null && !string.IsNullOrEmpty(activeOrder.Note) && activeOrder.Note.Contains("[Yêu cầu tính tiền]");

            result.Add(new CashierTableDto
            {
                Id = table.Id,
                TableNumber = table.Name,
                Capacity = table.Capacity,
                Status = table.Status,
                DiningAreaId = table.DiningAreaId,
                DiningAreaName = table.DiningArea?.Name ?? table.Location ?? string.Empty,
                OccupiedDurationMinutes = occupiedMinutes,
                ActiveOrderId = activeOrder?.Id,
                ActiveOrderCode = activeOrder?.OrderNumber,
                TemporaryTotalAmount = activeOrder?.TotalAmount ?? 0,
                IsBillRequested = isBillRequested,
                AssignedWaiterName = null,
                ReservedCustomerName = table.ReservedCustomerName,
                ReservedCustomerPhone = table.ReservedCustomerPhone,
                ReservedTime = table.ReservedTime,
                ReservedGuestCount = table.ReservedGuestCount,
                ReservedNote = table.ReservedNote
            });
        }

        return new ListResultDto<CashierTableDto>(result);
    }

    public virtual async Task<PagedResultDto<OrderDto>> GetOrdersAsync(GetCashierOrdersInputDto input)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);

        if (!string.IsNullOrWhiteSpace(input.SearchKeyword))
        {
            var kw = input.SearchKeyword.Trim().ToLower();
            queryable = queryable.Where(x =>
                x.OrderNumber.ToLower().Contains(kw) ||
                (x.Table != null && x.Table.Name.ToLower().Contains(kw)) ||
                (x.Note != null && x.Note.ToLower().Contains(kw)));
        }

        if (!string.IsNullOrWhiteSpace(input.StatusGroup))
        {
            switch (input.StatusGroup.Trim().ToLowerInvariant())
            {
                case "pending":
                    queryable = queryable.Where(x => x.Status == OrderStatus.Pending);
                    break;
                case "processing":
                    queryable = queryable.Where(x => x.Status == OrderStatus.Processing);
                    break;
                case "billrequested":
                    queryable = queryable.Where(x =>
                        (x.Status == OrderStatus.Pending || x.Status == OrderStatus.Processing) &&
                        x.Note != null && x.Note.Contains("[Yêu cầu tính tiền]"));
                    break;
                case "all":
                    break;
                case "completed":
                    queryable = queryable.Where(x => x.Status == OrderStatus.Completed);
                    break;
            }
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var pagedQuery = queryable
            .OrderByDescending(x => x.OrderDate)
            .ThenByDescending(x => x.CreationTime)
            .Skip(input.SkipCount)
            .Take(input.MaxResultCount);

        var orders = await AsyncExecuter.ToListAsync(pagedQuery);

        var dtos = ObjectMapper.Map<List<Order>, List<OrderDto>>(orders);
        await PopulateDishInfoAsync(dtos);

        return new PagedResultDto<OrderDto>(totalCount, dtos);
    }

    private async Task PopulateDishInfoAsync(IEnumerable<OrderDto> dtos)
    {
        var orderDtos = dtos.ToList();
        var allDishIds = orderDtos
            .Where(o => o.Items != null)
            .SelectMany(o => o.Items)
            .Select(i => i.DishId)
            .Distinct()
            .ToList();

        if (allDishIds.Count == 0)
        {
            return;
        }

        var dishQueryable = await _dishRepository.GetQueryableAsync();
        var dishes = await AsyncExecuter.ToListAsync(dishQueryable.Where(d => allDishIds.Contains(d.Id)));
        var dishDict = dishes.ToDictionary(d => d.Id);

        foreach (var orderDto in orderDtos)
        {
            if (orderDto.Items == null) continue;
            foreach (var item in orderDto.Items)
            {
                if (dishDict.TryGetValue(item.DishId, out var dish))
                {
                    if (string.IsNullOrEmpty(item.DishName))
                    {
                        item.DishName = dish.Name;
                    }
                    if (string.IsNullOrEmpty(item.DishPhotoUrl))
                    {
                        item.DishPhotoUrl = dish.ImageUrl;
                    }
                }
            }
        }
    }
}
