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
using Volo.Abp.Uow;

namespace Acme.TooHungry.Orders;

[RemoteService(IsEnabled = false)]
[Authorize]
public class OrderAppService : TooHungryAppService, IOrderAppService
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
        await PopulateDishInfoAsync(new[] { dto });
        return dto;
    }

    /// <summary>
    /// Lấy danh sách đơn hàng có phân trang, sắp xếp theo thời gian tạo mới nhất
    /// </summary>
    /// <param name="input">Tham số phân trang và sắp xếp</param>
    /// <returns>Danh sách đơn hàng phân trang</returns>
    public virtual async Task<PagedResultDto<OrderDto>> GetListAsync(GetOrdersInputDto input)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);

        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x =>
                (x.OrderNumber != null && x.OrderNumber.ToLower().Contains(filter)) ||
                (x.Note != null && x.Note.ToLower().Contains(filter)) ||
                (x.Table != null && x.Table.Name.ToLower().Contains(filter)));
        }

        if (input.Status.HasValue)
        {
            queryable = queryable.Where(x => x.Status == input.Status.Value);
        }

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
        await PopulateDishInfoAsync(dtos);
        return new PagedResultDto<OrderDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một đơn hàng, tự động tính tổng tiền và cập nhật trạng thái bàn sang Có khách (Occupied)
    /// </summary>
    /// <param name="input">Dữ liệu tạo mới đơn hàng</param>
    /// <returns>Thông tin đơn hàng vừa tạo</returns>
    public virtual async Task<OrderDto> CreateAsync(CreateUpdateOrderDto input)
    {
        var orderNumber = string.IsNullOrWhiteSpace(input.OrderNumber) ? CodeGenerator.GenerateOrderNumber(Clock.Now) : input.OrderNumber;
        var order = new Order(GuidGenerator.Create(), orderNumber, input.OrderDate, input.TableId, input.Note);
        if (input.Status != OrderStatus.Pending)
        {
            order.ChangeStatus(input.Status);
        }

        // Tính toán thành tiền từng món và tổng tiền đơn hàng trực tiếp từ giá món trên hệ thống (Dish.Price)
        if (input.Items != null && input.Items.Count > 0)
        {
            await PopulateOrderItemsAsync(order, input.Items.Select(x => (x.DishId, x.Quantity, x.Note)));
        }
        else
        {
            order.RecalculateTotalAmount();
        }

        Order inserted;
        try
        {
            inserted = await _orderRepository.InsertAsync(order, autoSave: true);
        }
        catch (Exception ex) when (ex.GetType().Name == "DbUpdateException" || ex.InnerException?.Message.Contains("IX_AppOrders_TableId") == true || ex.Message.Contains("IX_AppOrders_TableId") || ex.InnerException?.Message.Contains("UNIQUE") == true || ex.Message.Contains("UNIQUE") || ex.InnerException?.Message.Contains("duplicate") == true || ex.Message.Contains("duplicate"))
        {
            throw new BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder", innerException: ex);
        }

        // Tự động chuyển trạng thái bàn sang Có khách (Occupied) khi phát sinh đơn hàng
        if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null && table.Status != TableStatus.Occupied)
            {
                table.Occupy(Clock.Now);
                await _tableRepository.UpdateAsync(table, autoSave: true);
                CurrentUnitOfWork?.OnCompleted(async () =>
                {
                    await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
                });
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

        var oldStatus = order.Status;

        // Đơn hàng đã ở trạng thái kết thúc (Completed hoặc Cancelled) thì khóa hoàn toàn, không cho phép chỉnh sửa
        if (oldStatus == OrderStatus.Completed)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCompleted");
        }

        if (oldStatus == OrderStatus.Cancelled)
        {
            throw new BusinessException("TooHungry:Order:AlreadyCancelled");
        }

        order.SetOrderDate(input.OrderDate);
        order.ChangeStatus(input.Status);
        order.Note = input.Note;
        order.SetTable(input.TableId);
        if (!string.IsNullOrWhiteSpace(input.OrderNumber))
        {
            order.SetOrderNumber(input.OrderNumber);
        }

        if (input.Items != null && input.Items.Count > 0)
        {
            await PopulateOrderItemsAsync(order, input.Items.Select(x => (x.DishId, x.Quantity, x.Note)));
        }
        else
        {
            order.Items.Clear();
            order.RecalculateTotalAmount();
        }

        await _orderRepository.UpdateAsync(order, autoSave: true);

        // Nếu đơn hàng chuyển sang Hoàn thành (Completed) LẦN ĐẦU TIÊN:
        if (oldStatus != OrderStatus.Completed && order.Status == OrderStatus.Completed)
        {
            await ProcessOrderInventoryConsumptionAsync(order);

            if (order.TableId.HasValue)
            {
                var table = await _tableRepository.FindAsync(order.TableId.Value);
                if (table != null)
                {
                    table.MarkCleaning();
                    await _tableRepository.UpdateAsync(table, autoSave: true);
                    CurrentUnitOfWork?.OnCompleted(async () =>
                    {
                        await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
                    });
                }
            }
        }
        else if (oldStatus != OrderStatus.Cancelled && order.Status == OrderStatus.Cancelled)
        {
            // Nếu đơn hàng chuyển sang Hủy (Cancelled):
            if (order.TableId.HasValue)
            {
                var table = await _tableRepository.FindAsync(order.TableId.Value);
                if (table != null)
                {
                    table.Release();
                    await _tableRepository.UpdateAsync(table, autoSave: true);
                }

                CurrentUnitOfWork?.OnCompleted(async () =>
                {
                    await _realtimeNotifier.NotifyTableOrderUpdatedAsync(order.TableId.Value, false, null);
                    if (table != null)
                    {
                        await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
                    }
                });
            }
        }
        else if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null && table.Status != TableStatus.Occupied)
            {
                table.Occupy(Clock.Now);
                await _tableRepository.UpdateAsync(table, autoSave: true);
                CurrentUnitOfWork?.OnCompleted(async () =>
                {
                    await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
                });
            }
        }

        return await GetAsync(id);
    }

    /// <summary>
    /// Xóa một đơn hàng khỏi hệ thống
    /// </summary>
    /// <param name="id">Id đơn hàng cần xóa</param>
    [Authorize(TooHungryPermissions.Orders.Delete)]
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
        await PopulateDishInfoAsync(new[] { dto });
        return dto;
    }

    /// <summary>
    /// Gán danh sách món ăn vào đơn hàng với đơn giá (UnitPrice) lấy trực tiếp từ bảng Dish trên server.
    /// Đảm bảo Client không thể can thiệp hoặc gian lận giá bán.
    /// </summary>
    private async Task PopulateOrderItemsAsync(Order order, IEnumerable<(Guid DishId, int Quantity, string? Note)> items)
    {
        order.Items.Clear();
        var itemList = items.ToList();
        if (itemList.Count == 0)
        {
            order.RecalculateTotalAmount();
            return;
        }

        var dishIds = itemList.Select(x => x.DishId).Distinct().ToList();
        var dishes = await _dishRepository.GetListAsync(x => dishIds.Contains(x.Id));
        var dishMap = dishes.ToDictionary(x => x.Id);

        foreach (var itemDto in itemList)
        {
            if (itemDto.Quantity <= 0)
            {
                throw new BusinessException("TooHungry:Order:InvalidItemQuantity");
            }

            if (!dishMap.TryGetValue(itemDto.DishId, out var dish))
            {
                throw new EntityNotFoundException(typeof(Dish), itemDto.DishId);
            }

            var item = new OrderItem(GuidGenerator.Create())
            {
                OrderId = order.Id,
                DishId = itemDto.DishId,
                Quantity = itemDto.Quantity,
                UnitPrice = dish.Price,
                TotalPrice = itemDto.Quantity * dish.Price,
                Note = itemDto.Note
            };
            order.Items.Add(item);
        }

        order.RecalculateTotalAmount();
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
            order.Complete();
            await _orderRepository.UpdateAsync(order, autoSave: true);
            await ProcessOrderInventoryConsumptionAsync(order);
        }

        var table = await _tableRepository.FindAsync(tableId);
        if (table != null)
        {
            table.Release();
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

        var orderDishIds = order.Items.Select(x => x.DishId).Distinct().ToList();
        var recipeQueryable = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var activeRecipes = await AsyncExecuter.ToListAsync(
            recipeQueryable.Where(x => orderDishIds.Contains(x.DishId) && x.IsActive)
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
                        if (retryCount == 0)
                        {
                            await _inventoryManager.DeductFefoAsync(
                                recipeIngredient.IngredientId,
                                totalRequiredQty,
                                $"ORDER-{order.OrderNumber}"
                            );
                        }
                        else
                        {
                            using (var uow = UnitOfWorkManager.Begin(new AbpUnitOfWorkOptions { IsTransactional = true }, requiresNew: true))
                            {
                                await _inventoryManager.DeductFefoAsync(
                                    recipeIngredient.IngredientId,
                                    totalRequiredQty,
                                    $"ORDER-{order.OrderNumber}"
                                );
                                await uow.CompleteAsync();
                            }
                        }
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

        // Gom nhóm các món trong giỏ theo DishId để tính tổng số lượng đặt
        var groupedItems = input.Items
            .GroupBy(x => x.DishId)
            .Select(g => new { DishId = g.Key, TotalQuantity = g.Sum(x => x.Quantity), Items = g.ToList() })
            .ToList();

        var dishIds = groupedItems.Select(x => x.DishId).ToList();

        var recipeQueryable = await _recipeRepository.WithDetailsAsync(x => x.Ingredients);
        var activeRecipes = await AsyncExecuter.ToListAsync(
            recipeQueryable.Where(x => dishIds.Contains(x.DishId) && x.IsActive)
        );

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
        var isNewOrder = false;
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
                isNewOrder = true;
                order = new Order(
                    GuidGenerator.Create(),
                    CodeGenerator.GenerateOrderNumber(Clock.Now),
                    Clock.Now,
                    input.TableId,
                    input.Note
                );
            }
        }

        if (input.Note != null)
        {
            order.Note = input.Note;
        }

        await PopulateOrderItemsAsync(order, input.Items.Select(x => (x.DishId, x.Quantity, x.Note)));

        try
        {
            if (isNewOrder)
            {
                order = await _orderRepository.InsertAsync(order, autoSave: true);
            }
            else
            {
                await _orderRepository.UpdateAsync(order, autoSave: true);
            }
        }
        catch (Exception ex) when (ex.GetType().Name == "DbUpdateException" || ex.InnerException?.Message.Contains("IX_AppOrders_TableId") == true || ex.Message.Contains("IX_AppOrders_TableId") || ex.InnerException?.Message.Contains("UNIQUE") == true || ex.Message.Contains("UNIQUE") || ex.InnerException?.Message.Contains("duplicate") == true || ex.Message.Contains("duplicate"))
        {
            throw new BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder", innerException: ex);
        }

        // Cập nhật trạng thái bàn sang Có khách (Occupied) nếu chưa phải
        if (table.Status != TableStatus.Occupied)
        {
            table.Occupy(Clock.Now);
            await _tableRepository.UpdateAsync(table, autoSave: true);
            CurrentUnitOfWork?.OnCompleted(async () =>
            {
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
            });
        }

        // Phát tín hiệu Realtime SignalR sau khi commit UoW
        CurrentUnitOfWork?.OnCompleted(async () =>
        {
            await _realtimeNotifier.NotifyTableOrderUpdatedAsync(table.Id, true, order.Id);
        });

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

        order.Cancel();
        if (!string.IsNullOrWhiteSpace(input?.Reason))
        {
            order.Note = string.IsNullOrWhiteSpace(order.Note)
                ? $"[Hủy: {input.Reason}]"
                : $"{order.Note} [Hủy: {input.Reason}]";
        }

        await _orderRepository.UpdateAsync(order, autoSave: true);

        if (order.TableId.HasValue)
        {
            var table = await _tableRepository.FindAsync(order.TableId.Value);
            if (table != null)
            {
                table.Release();
                await _tableRepository.UpdateAsync(table, autoSave: true);
                CurrentUnitOfWork?.OnCompleted(async () =>
                {
                    await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
                });
            }

            CurrentUnitOfWork?.OnCompleted(async () =>
            {
                await _realtimeNotifier.NotifyTableOrderUpdatedAsync(order.TableId.Value, false, null);
            });
        }
    }

    /// <summary>
    /// Hoàn tất thanh toán đơn hàng (RM-016):
    /// Chuyển trạng thái đơn hàng sang Completed, trừ kho FEFO theo công thức món ăn,
    /// chuyển trạng thái bàn sang Cleaning, phát sóng realtime SignalR và trả về OrderDto.
    /// </summary>
    [Authorize(TooHungryPermissions.Orders.Edit)]
    public virtual async Task<OrderDto> CompletePaymentAsync(Guid id, CompletePaymentInputDto input)
    {
        var queryable = await _orderRepository.WithDetailsAsync(x => x.Items, x => x.Table!);
        var order = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id);
        if (order == null)
        {
            throw new EntityNotFoundException(typeof(Order), id);
        }

        order.Complete();
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
                table.MarkCleaning();
                await _tableRepository.UpdateAsync(table, autoSave: true);
                await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
            }
        }

        return await GetAsync(id);
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
