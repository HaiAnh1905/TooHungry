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
using Acme.TooHungry.Recipes;
using Acme.TooHungry.Inventories;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Ingredients;
using Volo.Abp;
using Volo.Abp.Data;

namespace Acme.TooHungry.Orders;

[RemoteService(IsEnabled = false)]
[Authorize]
public class OrderAppService : ApplicationService, IOrderAppService
{
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly ITableRealtimeNotifier _realtimeNotifier;
    private readonly IRepository<Recipe, Guid> _recipeRepository;
    private readonly InventoryManager _inventoryManager;
    private readonly IRepository<Dish, Guid> _dishRepository;
    private readonly IRepository<Ingredient, Guid> _ingredientRepository;
    private readonly IRepository<InventoryBatch, Guid> _batchRepository;

    public OrderAppService(
        IRepository<Order, Guid> repository,
        IRepository<RestaurantTable, Guid> tableRepository,
        ITableRealtimeNotifier realtimeNotifier,
        IRepository<Recipe, Guid> recipeRepository,
        InventoryManager inventoryManager,
        IRepository<Dish, Guid> dishRepository,
        IRepository<Ingredient, Guid> ingredientRepository,
        IRepository<InventoryBatch, Guid> batchRepository)
    {
        _orderRepository = repository;
        _tableRepository = tableRepository;
        _realtimeNotifier = realtimeNotifier;
        _recipeRepository = recipeRepository;
        _inventoryManager = inventoryManager;
        _dishRepository = dishRepository;
        _ingredientRepository = ingredientRepository;
        _batchRepository = batchRepository;
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
                if (!table.OccupiedTime.HasValue) table.OccupiedTime = DateTime.Now;
                await _tableRepository.UpdateAsync(table, autoSave: true);
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
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

        // Nếu đơn hàng chuyển sang Hoàn thành (Completed):
        // 1. Tự động tính tiêu hao nguyên liệu theo Recipe và trừ kho FEFO
        // 2. Chuyển bàn ăn sang trạng thái Dọn dẹp (Cleaning)
        if (order.Status == OrderStatus.Completed)
        {
            await ProcessOrderInventoryConsumptionAsync(order);

            if (order.TableId.HasValue)
            {
                var table = await _tableRepository.FindAsync(order.TableId.Value);
                if (table != null)
                {
                    table.Status = TableStatus.Cleaning;
                    table.OccupiedTime = null;
                    table.ReservedCustomerName = null;
                    table.ReservedCustomerPhone = null;
                    table.ReservedGuestCount = null;
                    table.ReservedTime = null;
                    table.ReservedNote = null;
                    await _tableRepository.UpdateAsync(table, autoSave: true);
                    await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
                }
            }
        }
        else if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null && table.Status != TableStatus.Occupied)
            {
                table.Status = TableStatus.Occupied;
                if (!table.OccupiedTime.HasValue) table.OccupiedTime = DateTime.Now;
                await _tableRepository.UpdateAsync(table, autoSave: true);
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
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
            await ProcessOrderInventoryConsumptionAsync(order);
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
            await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name);
        }
    }

    /// <summary>
    /// Tự động phân tích Recipe của các món trong Order và khấu trừ tồn kho theo thuật toán FEFO.
    /// Nếu món không có Recipe active, bỏ qua không trừ kho (US3).
    /// Nếu thiếu kho, trừ hết về 0 và ghi nhận cảnh báo (US2).
    /// </summary>
    private async Task ProcessOrderInventoryConsumptionAsync(Order order)
    {
        if (order.Items == null || !order.Items.Any())
        {
            return;
        }

        var recipeQueryable = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var activeRecipes = await AsyncExecuter.ToListAsync(
            recipeQueryable.Where(x => x.IsActive)
        );

        foreach (var orderItem in order.Items)
        {
            var recipe = activeRecipes.FirstOrDefault(x => x.DishId == orderItem.DishId);
            if (recipe == null)
            {
                // Dish chưa có Recipe hoặc Recipe bị Inactive -> Bỏ qua, bán bình thường không trừ kho (US3)
                continue;
            }

            foreach (var recipeIngredient in recipe.Ingredients.Where(x => x.IsActive))
            {
                var baseQtyPerDish = recipeIngredient.CalculateBaseQuantity();
                var totalRequiredQty = baseQtyPerDish * orderItem.Quantity;

                // Khấu trừ theo thuật toán FEFO có cơ chế retry tương tranh
                var retryCount = 0;
                while (true)
                {
                    try
                    {
                        await _inventoryManager.DeductFefoAsync(
                            recipeIngredient.IngredientId,
                            totalRequiredQty,
                            $"ORDER-{order.OrderNumber}"
                        );
                        break;
                    }
                    catch (AbpDbConcurrencyException) when (retryCount < 3)
                    {
                        retryCount++;
                        await Task.Delay(50 * retryCount);
                    }
                }
            }
        }
    }

    /// <summary>
    /// Kiểm tra đối chiếu số lượng tồn kho khả dụng hiện tại trong kho đối với các nguyên liệu cấu thành món ăn theo Recipe
    /// </summary>
    public virtual async Task<StockValidationResultDto> ValidateStockAsync(ValidateOrderStockInputDto input)
    {
        var result = new StockValidationResultDto { IsValid = true };
        if (input.Items == null || input.Items.Count == 0)
        {
            return result;
        }

        var recipeQueryable = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var activeRecipes = await AsyncExecuter.ToListAsync(recipeQueryable.Where(x => x.IsActive));

        // Gom nhóm các món trong giỏ theo DishId để tính tổng số lượng đặt
        var groupedItems = input.Items
            .GroupBy(x => x.DishId)
            .Select(g => new { DishId = g.Key, TotalQuantity = g.Sum(x => x.Quantity), Items = g.ToList() })
            .ToList();

        var dishIds = groupedItems.Select(x => x.DishId).ToList();
        var dishQueryable = await _dishRepository.GetQueryableAsync();
        var dishes = await AsyncExecuter.ToListAsync(dishQueryable.Where(x => dishIds.Contains(x.Id)));
        var dishDict = dishes.ToDictionary(x => x.Id);

        var batchQueryable = await _batchRepository.GetQueryableAsync();
        var now = DateTime.UtcNow;

        // Tính tổng định lượng cần thiết theo từng nguyên liệu
        var ingredientRequirements = new Dictionary<Guid, (decimal TotalRequired, List<(Guid DishId, string DishName, decimal DishRequired)> Usages)>();

        foreach (var group in groupedItems)
        {
            var recipe = activeRecipes.FirstOrDefault(x => x.DishId == group.DishId);
            if (recipe == null)
            {
                // Món chưa có Recipe hoặc Recipe bị Inactive -> Bỏ qua, cho phép bán bình thường
                continue;
            }

            dishDict.TryGetValue(group.DishId, out var dish);
            var dishName = dish?.Name ?? "Món ăn";

            foreach (var recipeIngredient in recipe.Ingredients.Where(x => x.IsActive))
            {
                var baseQtyPerDish = recipeIngredient.CalculateBaseQuantity();
                var requiredForDish = baseQtyPerDish * group.TotalQuantity;

                if (!ingredientRequirements.TryGetValue(recipeIngredient.IngredientId, out var current))
                {
                    current = (0, new List<(Guid, string, decimal)>());
                }

                current.TotalRequired += requiredForDish;
                current.Usages.Add((group.DishId, dishName, requiredForDish));
                ingredientRequirements[recipeIngredient.IngredientId] = current;
            }
        }

        if (ingredientRequirements.Count == 0)
        {
            return result;
        }

        var ingredientIds = ingredientRequirements.Keys.ToList();
        var ingredientQueryable = await _ingredientRepository.GetQueryableAsync();
        var ingredients = await AsyncExecuter.ToListAsync(ingredientQueryable.Where(x => ingredientIds.Contains(x.Id)));
        var ingredientDict = ingredients.ToDictionary(x => x.Id);

        var allBatches = await AsyncExecuter.ToListAsync(
            batchQueryable.Where(x => ingredientIds.Contains(x.IngredientId) && x.IsActive && x.RemainingQuantity > 0)
        );

        foreach (var kvp in ingredientRequirements)
        {
            var ingredientId = kvp.Key;
            var (totalRequired, usages) = kvp.Value;
            ingredientDict.TryGetValue(ingredientId, out var ingredient);
            var ingredientName = ingredient?.Name ?? "Nguyên liệu";
            var unitName = ingredient?.BaseUnit ?? string.Empty;

            var validBatches = allBatches.Where(x => x.IngredientId == ingredientId);
            if (ingredient?.StorageType == StorageType.FRESH)
            {
                validBatches = validBatches.Where(x => x.ExpiryDate >= now);
            }

            var availableStock = validBatches.Sum(x => x.RemainingQuantity);

            if (availableStock < totalRequired)
            {
                result.IsValid = false;
                foreach (var usage in usages)
                {
                    result.Shortages.Add(new StockShortageItemDto
                    {
                        DishId = usage.DishId,
                        DishName = usage.DishName,
                        IngredientName = ingredientName,
                        RequiredQuantity = totalRequired,
                        AvailableQuantity = availableStock,
                        UnitName = unitName
                    });
                }
            }
        }

        return result;
    }

    /// <summary>
    /// Tạo mới hoặc cập nhật đơn hàng PENDING của bàn ăn, kiểm tra tồn kho và phát tín hiệu Realtime
    /// </summary>
    public virtual async Task<OrderDto> SubmitOrderAsync(SubmitOrderInputDto input)
    {
        if (input.Items == null || input.Items.Count == 0)
        {
            throw new BusinessException("TooHungry:Order:CartCannotBeEmpty");
        }

        var table = await _tableRepository.FindAsync(input.TableId);
        if (table == null)
        {
            throw new BusinessException("TooHungry:Order:TableNotFound");
        }

        // Validate tồn kho nguyên liệu theo Recipe
        var stockValidation = await ValidateStockAsync(new ValidateOrderStockInputDto
        {
            Items = input.Items
        });

        if (!stockValidation.IsValid)
        {
            var shortageDetails = string.Join("; ", stockValidation.Shortages.Select(s => $"{s.DishName} thiếu {s.IngredientName} (cần {s.RequiredQuantity} {s.UnitName}, còn {s.AvailableQuantity} {s.UnitName})"));
            throw new BusinessException("TooHungry:Order:InsufficientStock")
                .WithData("Shortages", shortageDetails);
        }

        Order? order = null;
        if (input.OrderId.HasValue && input.OrderId.Value != Guid.Empty)
        {
            var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
            order = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == input.OrderId.Value);
            if (order == null)
            {
                throw new EntityNotFoundException(typeof(Order), input.OrderId.Value);
            }

            if (order.Status == OrderStatus.Completed)
            {
                throw new BusinessException("TooHungry:Order:CannotCancelCompleted");
            }
        }
        else
        {
            // Kiểm tra xem bàn đã có đơn PENDING chưa để tuân thủ quy tắc duy nhất một Active Order
            var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
            order = await AsyncExecuter.FirstOrDefaultAsync(
                queryable.Where(x => x.TableId == input.TableId && x.Status == OrderStatus.Pending)
                         .OrderByDescending(x => x.OrderDate)
            );

            if (order == null)
            {
                order = new Order
                {
                    TableId = input.TableId,
                    OrderDate = DateTime.UtcNow,
                    Status = OrderStatus.Pending,
                    OrderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}"
                };
            }
        }

        if (input.Note != null)
        {
            order.Note = input.Note;
        }

        order.Items.Clear();
        foreach (var itemDto in input.Items)
        {
            var item = new OrderItem(GuidGenerator.Create())
            {
                OrderId = order.Id,
                DishId = itemDto.DishId,
                Quantity = itemDto.Quantity,
                UnitPrice = itemDto.UnitPrice,
                TotalPrice = itemDto.Quantity * itemDto.UnitPrice,
                Note = itemDto.Note
            };
            order.Items.Add(item);
        }
        order.TotalAmount = order.Items.Sum(x => x.TotalPrice);

        if (order.Id == Guid.Empty)
        {
            order = await _orderRepository.InsertAsync(order, autoSave: true);
        }
        else
        {
            await _orderRepository.UpdateAsync(order, autoSave: true);
        }

        // Cập nhật trạng thái bàn sang Có khách (Occupied) nếu chưa phải
        if (table.Status != TableStatus.Occupied)
        {
            table.Status = TableStatus.Occupied;
            if (!table.OccupiedTime.HasValue) table.OccupiedTime = DateTime.Now;
            await _tableRepository.UpdateAsync(table, autoSave: true);
            await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
        }

        // Phát tín hiệu Realtime SignalR
        await _realtimeNotifier.NotifyTableOrderUpdatedAsync(table.Id, true, order.Id);

        return await GetAsync(order.Id);
    }

    /// <summary>
    /// Hủy đơn hàng và phát tín hiệu Realtime giải phóng cờ Active Order
    /// </summary>
    public virtual async Task CancelOrderAsync(Guid id, CancelOrderInputDto? input = null)
    {
        var order = await _orderRepository.FindAsync(id);
        if (order == null)
        {
            throw new EntityNotFoundException(typeof(Order), id);
        }

        if (order.Status == OrderStatus.Completed)
        {
            throw new BusinessException("TooHungry:Order:CannotCancelCompleted");
        }

        order.Status = OrderStatus.Cancelled;
        if (!string.IsNullOrWhiteSpace(input?.Reason))
        {
            order.Note = string.IsNullOrWhiteSpace(order.Note)
                ? $"[Hủy: {input.Reason}]"
                : $"{order.Note} [Hủy: {input.Reason}]";
        }

        await _orderRepository.UpdateAsync(order, autoSave: true);

        if (order.TableId.HasValue)
        {
            await _realtimeNotifier.NotifyTableOrderUpdatedAsync(order.TableId.Value, false, null);
        }
    }

    /// <summary>
    /// Hoàn tất thanh toán đơn hàng (RM-016):
    /// Chuyển trạng thái đơn hàng sang Completed, trừ kho FEFO theo công thức món ăn,
    /// chuyển trạng thái bàn sang Cleaning, phát sóng realtime SignalR và trả về OrderDto.
    /// </summary>
    [Authorize(TooHungryPermissions.Orders.Default)]
    public virtual async Task<OrderDto> CompletePaymentAsync(Guid id, CompletePaymentInputDto input)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
        var order = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (order == null)
        {
            throw new EntityNotFoundException(typeof(Order), id);
        }

        if (order.Status == OrderStatus.Completed)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCompleted");
        }

        if (order.Status == OrderStatus.Cancelled)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCancelled");
        }

        order.Status = OrderStatus.Completed;
        if (!string.IsNullOrWhiteSpace(input.PaymentNote))
        {
            order.Note = string.IsNullOrWhiteSpace(order.Note)
                ? $"[{input.PaymentMethod}: {input.PaymentNote}]"
                : $"{order.Note} [{input.PaymentMethod}: {input.PaymentNote}]";
        }

        await _orderRepository.UpdateAsync(order, autoSave: true);

        // 1. Tự động tính tiêu hao nguyên liệu theo Recipe và trừ kho FEFO
        await ProcessOrderInventoryConsumptionAsync(order);

        // 2. Chuyển bàn ăn sang trạng thái Dọn dẹp (Cleaning) & phát Realtime SignalR
        if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null)
            {
                table.Status = TableStatus.Cleaning;
                table.OccupiedTime = null;
                table.ReservedCustomerName = null;
                table.ReservedCustomerPhone = null;
                table.ReservedGuestCount = null;
                table.ReservedTime = null;
                table.ReservedNote = null;
                await _tableRepository.UpdateAsync(table, autoSave: true);
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
            }
        }

        return await GetAsync(id);
    }
}
