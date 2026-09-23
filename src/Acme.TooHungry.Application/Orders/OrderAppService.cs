using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.Permissions;

using Acme.TooHungry.Tables;

namespace Acme.TooHungry.Orders;

[Authorize]
public class OrderAppService : ApplicationService, IOrderAppService
{
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;

    public OrderAppService(
        IRepository<Order, Guid> repository,
        IRepository<RestaurantTable, Guid> tableRepository)
    {
        _orderRepository = repository;
        _tableRepository = tableRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một đơn hàng theo Id (kèm danh sách món và thông tin bàn ăn)
    /// </summary>
    /// <param name="id">Id đơn hàng</param>
    /// <returns>Thông tin đơn hàng chi tiết DTO</returns>
    public virtual async Task<OrderDto> GetAsync(Guid id)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
        var order = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (order == null)
        {
            throw new EntityNotFoundException(typeof(Order), id);
        }

        var dto = ObjectMapper.Map<Order, OrderDto>(order);
        if (order.Table != null && string.IsNullOrEmpty(dto.TableName))
        {
            dto.TableName = order.Table.Name;
        }
        EnsureOrderAmounts(dto);
        return dto;
    }

    /// <summary>
    /// Lấy danh sách đơn hàng có phân trang, sắp xếp theo thời gian tạo mới nhất
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách đơn hàng phân trang</returns>
    public virtual async Task<PagedResultDto<OrderDto>> GetListAsync(PagedAndSortedResultRequestDto input)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
        var totalCount = await AsyncExecuter.CountAsync(queryable);

        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(Order.OrderDate) + " desc" : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<Order>, List<OrderDto>>(items);
        for (int i = 0; i < items.Count; i++)
        {
            if (items[i].Table != null && string.IsNullOrEmpty(dtos[i].TableName))
            {
                dtos[i].TableName = items[i].Table!.Name;
            }
            EnsureOrderAmounts(dtos[i]);
        }
        return new PagedResultDto<OrderDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một đơn hàng, tự động tính tổng tiền và cập nhật trạng thái bàn sang Có khách (Occupied)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới đơn hàng</param>
    /// <returns>Thông tin đơn hàng vừa tạo</returns>
    public virtual async Task<OrderDto> CreateAsync(CreateUpdateOrderDto input)
    {
        var order = new Order
        {
            TableId = input.TableId,
            OrderDate = input.OrderDate,
            Status = input.Status,
            Note = input.Note,
            OrderNumber = string.IsNullOrWhiteSpace(input.OrderNumber) ? $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}" : input.OrderNumber
        };

        // Tính toán thành tiền từng món và tổng tiền đơn hàng
        if (input.Items != null && input.Items.Count > 0)
        {
            foreach (var itemDto in input.Items)
            {
                var item = new OrderItem(GuidGenerator.Create())
                {
                    DishId = itemDto.DishId,
                    Quantity = itemDto.Quantity,
                    UnitPrice = itemDto.UnitPrice,
                    TotalPrice = itemDto.Quantity * itemDto.UnitPrice
                };
                order.Items.Add(item);
            }
            order.TotalAmount = order.Items.Sum(x => x.TotalPrice);
        }
        else if (input.TotalAmount > 0)
        {
            order.TotalAmount = input.TotalAmount;
        }

        var inserted = await _orderRepository.InsertAsync(order, autoSave: true);

        // Tự động chuyển trạng thái bàn sang Có khách (Occupied) khi phát sinh đơn hàng
        if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null && table.Status != TableStatus.Occupied)
            {
                table.Status = TableStatus.Occupied;
                await _tableRepository.UpdateAsync(table, autoSave: true);
            }
        }

        return await GetAsync(inserted.Id);
    }

    /// <summary>
    /// Cập nhật thông tin đơn hàng, danh sách món gọi và tính lại tổng tiền
    /// </summary>
    /// <param name="id">Id đơn hàng cần cập nhật</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin đơn hàng sau khi cập nhật</returns>
    public virtual async Task<OrderDto> UpdateAsync(Guid id, CreateUpdateOrderDto input)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
        var order = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (order == null)
        {
            throw new EntityNotFoundException(typeof(Order), id);
        }

        order.OrderDate = input.OrderDate;
        order.Status = input.Status;
        order.Note = input.Note;
        order.TableId = input.TableId;
        if (!string.IsNullOrWhiteSpace(input.OrderNumber))
        {
            order.OrderNumber = input.OrderNumber;
        }

        order.Items.Clear();
        if (input.Items != null && input.Items.Count > 0)
        {
            foreach (var itemDto in input.Items)
            {
                var item = new OrderItem(GuidGenerator.Create())
                {
                    OrderId = order.Id,
                    DishId = itemDto.DishId,
                    Quantity = itemDto.Quantity,
                    UnitPrice = itemDto.UnitPrice,
                    TotalPrice = itemDto.Quantity * itemDto.UnitPrice
                };
                order.Items.Add(item);
            }

            order.TotalAmount = order.Items.Sum(x => x.TotalPrice);
        }
        else
        {
            order.TotalAmount = input.TotalAmount;
        }

        await _orderRepository.UpdateAsync(order, autoSave: true);

        // Nếu đơn hàng chuyển sang Hoàn thành (Completed), tự động giải phóng bàn ăn về Available
        if (order.Status == OrderStatus.Completed && order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null)
            {
                table.Status = TableStatus.Available;
                table.ReservedCustomerName = null;
                table.ReservedCustomerPhone = null;
                table.ReservedGuestCount = null;
                table.ReservedTime = null;
                table.ReservedNote = null;
                await _tableRepository.UpdateAsync(table, autoSave: true);
            }
        }
        else if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null && table.Status != TableStatus.Occupied)
            {
                table.Status = TableStatus.Occupied;
                await _tableRepository.UpdateAsync(table, autoSave: true);
            }
        }

        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một đơn hàng khỏi hệ thống
    /// </summary>
    /// <param name="id">Id đơn hàng cần xóa</param>
    public virtual async Task DeleteAsync(Guid id)
    {
        await _orderRepository.DeleteAsync(id);
    }

    /// <summary>
    /// Lấy đơn hàng đang hoạt động (chưa hoàn thành / chưa hủy) của một bàn ăn cụ thể
    /// </summary>
    /// <param name="tableId">Id của bàn ăn</param>
    /// <returns>Đơn hàng đang hoạt động hoặc null nếu không có</returns>
    public virtual async Task<OrderDto?> GetActiveOrderByTableIdAsync(Guid tableId)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
        var activeOrder = await AsyncExecuter.FirstOrDefaultAsync(
            queryable.Where(x => x.TableId == tableId && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled)
                     .OrderByDescending(x => x.OrderDate)
        );

        if (activeOrder == null)
        {
            return null;
        }

        var dto = ObjectMapper.Map<Order, OrderDto>(activeOrder);
        if (activeOrder.Table != null && string.IsNullOrEmpty(dto.TableName))
        {
            dto.TableName = activeOrder.Table.Name;
        }
        EnsureOrderAmounts(dto);
        return dto;
    }

    /// <summary>
    /// Đảm bảo tính toán đúng thành tiền từng món và tổng tiền đơn hàng nếu bị thiếu
    /// </summary>
    /// <param name="dto">DTO đơn hàng cần kiểm tra</param>
    private static void EnsureOrderAmounts(OrderDto dto)
    {
        if (dto.Items != null && dto.Items.Count > 0)
        {
            foreach (var item in dto.Items)
            {
                if (item.TotalPrice == 0 && item.Quantity > 0 && item.UnitPrice > 0)
                {
                    item.TotalPrice = item.Quantity * item.UnitPrice;
                }
            }

            if (dto.TotalAmount == 0)
            {
                dto.TotalAmount = dto.Items.Sum(x => x.TotalPrice > 0 ? x.TotalPrice : (x.Quantity * x.UnitPrice));
            }
        }
    }

    /// <summary>
    /// Hoàn tất toàn bộ đơn hàng đang hoạt động của một bàn và giải phóng bàn về trạng thái Có sẵn (Available)
    /// </summary>
    /// <param name="tableId">Id bàn ăn</param>
    public virtual async Task CompleteActiveOrderByTableIdAsync(Guid tableId)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items);
        var activeOrders = await AsyncExecuter.ToListAsync(
            queryable.Where(x => x.TableId == tableId && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled)
        );

        foreach (var order in activeOrders)
        {
            order.Status = OrderStatus.Completed;
            await _orderRepository.UpdateAsync(order, autoSave: true);
        }

        var table = await _tableRepository.FindAsync(tableId);
        if (table != null)
        {
            table.Status = TableStatus.Available;
            table.ReservedCustomerName = null;
            table.ReservedCustomerPhone = null;
            table.ReservedGuestCount = null;
            table.ReservedTime = null;
            table.ReservedNote = null;
            await _tableRepository.UpdateAsync(table, autoSave: true);
        }
    }
}
