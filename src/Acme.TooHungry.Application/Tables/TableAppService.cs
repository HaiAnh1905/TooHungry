using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Dishes;
using Acme.TooHungry.Orders;
using Acme.TooHungry.Permissions;

namespace Acme.TooHungry.Tables;

[Authorize]
public class TableAppService : TooHungryAppService, ITableAppService
{
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;
    private readonly ITableRealtimeNotifier _realtimeNotifier;
    private readonly IRepository<Dish, Guid> _dishRepository;

    public TableAppService(
        IRepository<RestaurantTable, Guid> tableRepository,
        IRepository<Order, Guid> orderRepository,
        IRepository<DiningArea, Guid> diningAreaRepository,
        ITableRealtimeNotifier realtimeNotifier,
        IRepository<Dish, Guid> dishRepository)
    {
        _tableRepository = tableRepository;
        _orderRepository = orderRepository;
        _diningAreaRepository = diningAreaRepository;
        _realtimeNotifier = realtimeNotifier;
        _dishRepository = dishRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một bàn ăn theo Id (kèm thông tin Khu vực ăn uống liên kết)
    /// </summary>
    /// <param name="id">Id của bàn ăn</param>
    /// <returns>Thông tin chi tiết bàn ăn dạng DTO</returns>
    public virtual async Task<TableDto> GetAsync(Guid id)
    {
        // Truy vấn bàn ăn kèm thông tin liên kết của DiningArea
        var queryable = await _tableRepository.WithDetailsAsync(x => x.DiningArea);
        var table = await AsyncExecuter.FirstOrDefaultAsync(queryable, x => x.Id == id)
            ?? await _tableRepository.GetAsync(id);

        var dto = ObjectMapper.Map<RestaurantTable, TableDto>(table);

        // Đồng bộ dữ liệu hiển thị giữa DiningAreaName và Location nếu một trong hai bị thiếu
        if (string.IsNullOrWhiteSpace(dto.DiningAreaName) && !string.IsNullOrWhiteSpace(dto.Location))
        {
            dto.DiningAreaName = dto.Location;
        }
        else if (string.IsNullOrWhiteSpace(dto.Location) && !string.IsNullOrWhiteSpace(dto.DiningAreaName))
        {
            dto.Location = dto.DiningAreaName;
        }

        var activeOrder = await _orderRepository.FirstOrDefaultAsync(x => x.TableId == id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);
        if (activeOrder != null)
        {
            dto.ActiveOrderId = activeOrder.Id;
            dto.HasActiveOrder = true;
        }

        if (table.Status == TableStatus.Occupied && !dto.OccupiedTime.HasValue)
        {
            dto.OccupiedTime = table.LastModificationTime ?? table.CreationTime;
        }

        return dto;
    }

    /// <summary>
    /// Lấy danh sách bàn ăn có phân trang và bộ lọc linh hoạt (theo tên, khu vực, trạng thái, người đặt bàn)
    /// </summary>
    /// <param name="input">Tham số tìm kiếm, phân trang và sắp xếp</param>
    /// <returns>Danh sách bàn ăn phân trang kèm tổng số lượng bản ghi</returns>
    public virtual async Task<PagedResultDto<TableDto>> GetListAsync(GetTablesInput input)
    {
        // Nạp kèm thông tin DiningArea để ánh xạ chính xác tên khu vực
        var queryable = await _tableRepository.WithDetailsAsync(x => x.DiningArea);

        // 1. Lọc theo từ khóa tìm kiếm (tên bàn, vị trí, khu vực, khách đặt trước, số điện thoại)
        if (!string.IsNullOrWhiteSpace(input.Filter))
        {
            var filter = input.Filter.Trim().ToLower();
            queryable = queryable.Where(x => x.Name.ToLower().Contains(filter)
                || (x.Location != null && x.Location.ToLower().Contains(filter))
                || (x.DiningArea != null && x.DiningArea.Name.ToLower().Contains(filter))
                || (x.ReservedCustomerName != null && x.ReservedCustomerName.ToLower().Contains(filter))
                || (x.ReservedCustomerPhone != null && x.ReservedCustomerPhone.Contains(filter)));
        }

        // 2. Lọc theo trạng thái bàn ăn (Available, Occupied, Reserved, Disabled)
        if (input.Status.HasValue)
        {
            queryable = queryable.Where(x => x.Status == input.Status.Value);
        }

        // 3. Lọc theo Id của Khu vực bàn ăn
        if (input.DiningAreaId.HasValue)
        {
            queryable = queryable.Where(x => x.DiningAreaId == input.DiningAreaId.Value);
        }

        var totalCount = await AsyncExecuter.CountAsync(queryable);

        // 4. Sắp xếp và phân trang
        var sorting = input.Sorting.IsNullOrWhiteSpace() ? nameof(RestaurantTable.Name) : input.Sorting;
        queryable = queryable.OrderBy(sorting);
        queryable = queryable.PageBy(input.SkipCount, input.MaxResultCount);

        var items = await AsyncExecuter.ToListAsync(queryable);
        var dtos = ObjectMapper.Map<List<RestaurantTable>, List<TableDto>>(items);

        // Đảm bảo mỗi bàn đều có tên khu vực đồng nhất giữa DiningAreaName và Location
        var tableIds = items.Select(x => x.Id).ToList();
        var activeOrdersQuery = (await _orderRepository.GetQueryableAsync())
            .Where(x => x.TableId.HasValue && tableIds.Contains(x.TableId.Value) && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled)
            .Select(x => new { TableId = x.TableId!.Value, x.Id });
        var activeOrders = await AsyncExecuter.ToListAsync(activeOrdersQuery);

        var activeOrderMap = activeOrders.ToDictionary(x => x.TableId, x => x.Id);

        foreach (var dto in dtos)
        {
            if (string.IsNullOrWhiteSpace(dto.DiningAreaName) && !string.IsNullOrWhiteSpace(dto.Location))
            {
                dto.DiningAreaName = dto.Location;
            }
            else if (string.IsNullOrWhiteSpace(dto.Location) && !string.IsNullOrWhiteSpace(dto.DiningAreaName))
            {
                dto.Location = dto.DiningAreaName;
            }

            if (activeOrderMap.TryGetValue(dto.Id, out var orderId))
            {
                dto.ActiveOrderId = orderId;
                dto.HasActiveOrder = true;
            }

            if (dto.Status == TableStatus.Occupied && !dto.OccupiedTime.HasValue)
            {
                var originalItem = items.FirstOrDefault(x => x.Id == dto.Id);
                dto.OccupiedTime = originalItem?.LastModificationTime ?? originalItem?.CreationTime;
            }
        }

        return new PagedResultDto<TableDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một bàn ăn trong nhà hàng
    /// </summary>
    /// <param name="input">Thông tin bàn ăn cần tạo</param>
    /// <returns>Thông tin bàn ăn vừa tạo</returns>
    [Authorize(TooHungryPermissions.Tables.Create)]
    public virtual async Task<TableDto> CreateAsync(CreateUpdateTableDto input)
    {
        // 1. Chuẩn hóa tên bàn
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableNameRequired);
        }

        if (input.Capacity < 1 || input.Capacity > 100)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableInvalidCapacity);
        }

        // 2. Guard: Kiểm tra trùng tên bàn trên toàn hệ thống
        var isExist = await _tableRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableNameAlreadyExists).WithData("0", cleanName);
        }

        // 3. Kiểm tra khu vực có đang hoạt động không
        if (input.DiningAreaId.HasValue)
        {
            var area = await _diningAreaRepository.FindAsync(input.DiningAreaId.Value);
            if (area != null && !area.IsActive)
            {
                throw new BusinessException(TooHungryDomainErrorCodes.TableAreaInactive).WithData("0", area.Name);
            }
        }

        var table = new RestaurantTable(GuidGenerator.Create(), cleanName, input.Capacity, input.DiningAreaId);

        // 4. Tự động đồng bộ trường Location theo Khu vực được chọn
        if (input.DiningAreaId.HasValue)
        {
            var area = await _diningAreaRepository.FindAsync(input.DiningAreaId.Value);
            table.SetLocation(area?.Name);
        }
        else if (!string.IsNullOrWhiteSpace(input.Location))
        {
            var area = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name.ToLower() == input.Location.Trim().ToLower());
            if (area != null)
            {
                if (!area.IsActive)
                {
                    throw new BusinessException(TooHungryDomainErrorCodes.TableAreaInactive).WithData("0", area.Name);
                }
                table.SetDiningArea(area.Id, area.Name);
            }
        }

        // 5. Lưu vào cơ sở dữ liệu
        var inserted = await _tableRepository.InsertAsync(table, autoSave: true);
        var resDto = ObjectMapper.Map<RestaurantTable, TableDto>(inserted);
        if (string.IsNullOrWhiteSpace(resDto.DiningAreaName))
        {
            resDto.DiningAreaName = inserted.Location;
        }
        return resDto;
    }

    /// <summary>
    /// Cập nhật thông tin một bàn ăn hiện có
    /// </summary>
    /// <param name="id">Id của bàn ăn cần chỉnh sửa</param>
    /// <param name="input">Dữ liệu cập nhật mới</param>
    /// <returns>Thông tin bàn ăn sau khi cập nhật</returns>
    [Authorize(TooHungryPermissions.Tables.Edit)]
    public virtual async Task<TableDto> UpdateAsync(Guid id, CreateUpdateTableDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableNameRequired);
        }

        if (input.Capacity < 1 || input.Capacity > 100)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableInvalidCapacity);
        }

        // Guard 1: Kiểm tra trùng tên bàn với bàn khác trên toàn hệ thống
        var isExist = await _tableRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableNameAlreadyExists).WithData("0", cleanName);
        }

        var table = await _tableRepository.GetAsync(id);

        if (input.DiningAreaId.HasValue && input.DiningAreaId != table.DiningAreaId)
        {
            var area = await _diningAreaRepository.FindAsync(input.DiningAreaId.Value);
            if (area != null && !area.IsActive)
            {
                throw new BusinessException(TooHungryDomainErrorCodes.TableAreaInactive).WithData("0", area.Name);
            }
        }

        // Guard 2: Khi bàn đang sử dụng (Occupied) thì không được phép chỉnh sửa thông tin bàn
        if (table.Status == TableStatus.Occupied)
        {
            var isInfoChanged = table.Name != cleanName
                || table.Capacity != input.Capacity
                || table.DiningAreaId != input.DiningAreaId
                || (table.Location ?? string.Empty) != (input.Location ?? string.Empty);

            if (isInfoChanged)
            {
                throw new BusinessException(TooHungryDomainErrorCodes.TableCannotEditOccupied);
            }
        }

        table.SetName(cleanName);
        table.SetCapacity(input.Capacity);
        table.SetDiningArea(input.DiningAreaId);

        // Đồng bộ trường Location theo DiningArea được chọn
        if (input.DiningAreaId.HasValue)
        {
            var area = await _diningAreaRepository.FindAsync(input.DiningAreaId.Value);
            table.SetLocation(area?.Name);
        }
        else if (!string.IsNullOrWhiteSpace(input.Location))
        {
            var area = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name.ToLower() == input.Location.Trim().ToLower());
            if (area != null)
            {
                table.SetDiningArea(area.Id, area.Name);
            }
            else
            {
                table.SetLocation(input.Location.Trim());
            }
        }
        else
        {
            table.SetLocation(null);
        }

        await _tableRepository.UpdateAsync(table, autoSave: true);
        var updatedDto = ObjectMapper.Map<RestaurantTable, TableDto>(table);
        if (string.IsNullOrWhiteSpace(updatedDto.DiningAreaName))
        {
            updatedDto.DiningAreaName = table.Location;
        }
        return updatedDto;
    }

    /// <summary>
    /// Xóa một bàn ăn khỏi hệ thống (kiểm tra ràng buộc khách đang ngồi và đơn hàng đang liên kết)
    /// </summary>
    /// <param name="id">Id của bàn ăn cần xóa</param>
    [Authorize(TooHungryPermissions.Tables.Delete)]
    public virtual async Task DeleteAsync(Guid id)
    {
        var table = await _tableRepository.FindAsync(id);
        if (table == null)
        {
            return;
        }

        // Guard 1: Bàn đang sử dụng (có khách ngồi) không được phép xóa
        if (table.Status == TableStatus.Occupied)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableCannotDeleteOccupied).WithData("0", table.Name);
        }

        // Guard 2: Không cho phép xóa bàn nếu đang có đơn hàng (Order) liên kết
        var orderCount = await _orderRepository.CountAsync(x => x.TableId == id);
        if (orderCount > 0)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableCannotDeleteWithOrders).WithData("0", table.Name).WithData("1", orderCount);
        }

        await _tableRepository.DeleteAsync(table);
    }

    /// <summary>
    /// Đổi nhanh trạng thái bàn ăn (phục vụ & thu ngân)
    /// </summary>
    public virtual async Task<TableDto> ChangeStatusAsync(Guid id, TableStatus status)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.UpdateStatus) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Edit) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Manage))
        {
            throw new AbpAuthorizationException("Bạn không có quyền cập nhật trạng thái bàn ăn!");
        }

        var table = await _tableRepository.GetAsync(id);

        // Atomic Status & Concurrency checks:
        if (table.Status == TableStatus.Disabled && status != TableStatus.Available && status != TableStatus.Disabled)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableInactive);
        }

        if (table.Status == TableStatus.Cleaning && status == TableStatus.Occupied)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableCleaning);
        }

        if (table.Status == TableStatus.Occupied && status == TableStatus.Occupied)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableAlreadyOccupied);
        }

        if (table.Status == TableStatus.Occupied && status == TableStatus.Available)
        {
            var hasActiveOrder = await _orderRepository.AnyAsync(x => x.TableId == id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);
            if (hasActiveOrder)
            {
                throw new BusinessException(TooHungryDomainErrorCodes.TablePendingPayment);
            }
        }

        if (status == TableStatus.Occupied)
        {
            table.Occupy(Clock.Now);
        }
        else if (status == TableStatus.Available)
        {
            table.Release();
        }
        else if (status == TableStatus.Cleaning)
        {
            table.MarkCleaning();
        }
        else
        {
            table.Release();
            table.SetStatus(status);
        }

        await _tableRepository.UpdateAsync(table, autoSave: true);
        CurrentUnitOfWork?.OnCompleted(async () =>
        {
            await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
        });

        var dto = ObjectMapper.Map<RestaurantTable, TableDto>(table);
        if (string.IsNullOrWhiteSpace(dto.DiningAreaName))
        {
            dto.DiningAreaName = table.Location;
        }

        var activeOrder = await _orderRepository.FirstOrDefaultAsync(x => x.TableId == id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);
        if (activeOrder != null)
        {
            dto.ActiveOrderId = activeOrder.Id;
            dto.HasActiveOrder = true;
        }

        return dto;
    }

    /// <summary>
    /// Cập nhật trạng thái hàng loạt cho tất cả các bàn trong cùng một khu vực (ví dụ khóa / mở khu vực)
    /// </summary>
    /// <param name="diningAreaId">Id của khu vực ăn uống</param>
    /// <param name="status">Trạng thái mới áp dụng cho toàn bộ bàn trong khu vực</param>
    public virtual async Task SetAreaTablesStatusAsync(Guid diningAreaId, TableStatus status)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.UpdateStatus) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Edit) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Manage))
        {
            throw new AbpAuthorizationException("Bạn không có quyền cập nhật trạng thái bàn ăn!");
        }

        var tables = await _tableRepository.GetListAsync(x => x.DiningAreaId == diningAreaId);
        foreach (var table in tables)
        {
            if (status == TableStatus.Available)
            {
                table.Release();
            }
            else if (status == TableStatus.Cleaning)
            {
                table.MarkCleaning();
            }
            else if (status == TableStatus.Occupied)
            {
                table.Occupy(table.OccupiedTime ?? Clock.Now);
            }
            else
            {
                table.Release();
                table.SetStatus(status);
            }
        }

        await _tableRepository.UpdateManyAsync(tables, autoSave: true);

        foreach (var table in tables)
        {
            await _realtimeNotifier.NotifyTableStatusChangedAsync(table.Id, table.Status, table.Name, table.DiningAreaId, table.OccupiedTime);
        }
    }

    /// <summary>
    /// Chuyển bàn ăn: Di chuyển đơn hàng đang mở và thời gian ngồi từ bàn nguồn sang bàn đích
    /// </summary>
    public virtual async Task<TableDto> TransferTableAsync(TransferTableInputDto input)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.UpdateStatus) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Edit) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Manage))
        {
            throw new AbpAuthorizationException("Bạn không có quyền chuyển bàn ăn!");
        }

        if (input.SourceTableId == input.TargetTableId)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableSameSourceAndTarget);
        }

        var sourceTable = await _tableRepository.GetAsync(input.SourceTableId);
        var targetTable = await _tableRepository.GetAsync(input.TargetTableId);

        if (sourceTable.Status != TableStatus.Occupied)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableSourceNotOccupied).WithData("0", sourceTable.Name);
        }

        if (targetTable.Status != TableStatus.Available)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableTargetNotEmpty).WithData("0", targetTable.Name);
        }

        // 1. Chuyển active order (nếu có) sang bàn đích
        var activeOrder = await _orderRepository.FirstOrDefaultAsync(x => x.TableId == sourceTable.Id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);
        if (activeOrder != null)
        {
            activeOrder.SetTable(targetTable.Id);
            if (!string.IsNullOrWhiteSpace(input.Note))
            {
                activeOrder.Note = string.IsNullOrWhiteSpace(activeOrder.Note)
                    ? $"[Chuyển từ {sourceTable.Name}]: {input.Note}"
                    : $"{activeOrder.Note} | [Chuyển từ {sourceTable.Name}]: {input.Note}";
            }
            await _orderRepository.UpdateAsync(activeOrder, autoSave: true);
        }

        // 2. Cập nhật Bàn đích: Occupied, kế thừa OccupiedTime
        targetTable.Occupy(sourceTable.OccupiedTime ?? Clock.Now);
        await _tableRepository.UpdateAsync(targetTable, autoSave: true);

        // 3. Phân nhánh Bàn nguồn:
        // Nếu có activeOrder/dùng món: Chuyển sang Cleaning; nếu không có order: Chuyển thẳng về Available
        var hasActiveOrder = activeOrder != null;
        if (hasActiveOrder)
        {
            sourceTable.MarkCleaning();
        }
        else
        {
            sourceTable.Release();
        }
        await _tableRepository.UpdateAsync(sourceTable, autoSave: true);

        // 4. Phát sự kiện SignalR cho cả 2 bàn sau khi commit UoW
        CurrentUnitOfWork?.OnCompleted(async () =>
        {
            await _realtimeNotifier.NotifyTableStatusChangedAsync(sourceTable.Id, sourceTable.Status, sourceTable.Name, sourceTable.DiningAreaId, sourceTable.OccupiedTime);
            await _realtimeNotifier.NotifyTableStatusChangedAsync(targetTable.Id, targetTable.Status, targetTable.Name, targetTable.DiningAreaId, targetTable.OccupiedTime);
            if (activeOrder != null)
            {
                await _realtimeNotifier.NotifyTableOrderUpdatedAsync(sourceTable.Id, false, null);
                await _realtimeNotifier.NotifyTableOrderUpdatedAsync(targetTable.Id, true, activeOrder.Id);
            }
        });

        var targetDto = ObjectMapper.Map<RestaurantTable, TableDto>(targetTable);
        if (string.IsNullOrWhiteSpace(targetDto.DiningAreaName))
        {
            targetDto.DiningAreaName = targetTable.Location;
        }
        if (activeOrder != null)
        {
            targetDto.ActiveOrderId = activeOrder.Id;
            targetDto.HasActiveOrder = true;
        }

        return targetDto;
    }

    /// <summary>
    /// Gộp bàn ăn: Ghép toàn bộ món ăn từ bàn phụ sang bàn chính để thanh toán 1 hóa đơn duy nhất
    /// </summary>
    public virtual async Task<TableDto> MergeTablesAsync(MergeTablesInputDto input)
    {
        if (!await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.UpdateStatus) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Edit) &&
            !await AuthorizationService.IsGrantedAsync(TooHungryPermissions.Tables.Manage))
        {
            throw new AbpAuthorizationException("Bạn không có quyền gộp bàn ăn!");
        }

        if (input.PrimaryTableId == input.SecondaryTableId)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableSameSourceAndTarget);
        }

        var primaryTable = await _tableRepository.GetAsync(input.PrimaryTableId);
        var secondaryTable = await _tableRepository.GetAsync(input.SecondaryTableId);

        if (primaryTable.Status != TableStatus.Occupied || secondaryTable.Status != TableStatus.Occupied)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.TableBothMustBeOccupied);
        }

        // Nạp kèm Items của order
        var primaryQuery = await _orderRepository.WithDetailsAsync(x => x.Items);
        var primaryOrder = await AsyncExecuter.FirstOrDefaultAsync(
            primaryQuery,
            x => x.TableId == primaryTable.Id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);

        var secondaryQuery = await _orderRepository.WithDetailsAsync(x => x.Items);
        var secondaryOrder = await AsyncExecuter.FirstOrDefaultAsync(
            secondaryQuery,
            x => x.TableId == secondaryTable.Id && x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);

        if (secondaryOrder != null)
        {
            if (primaryOrder == null)
            {
                // Bàn chính chưa có đơn, chuyển thẳng đơn bàn phụ sang bàn chính
                secondaryOrder.SetTable(primaryTable.Id);
                secondaryOrder.Note = string.IsNullOrWhiteSpace(secondaryOrder.Note)
                    ? $"[Gộp từ {secondaryTable.Name}]"
                    : $"{secondaryOrder.Note} | [Gộp từ {secondaryTable.Name}]";
                await _orderRepository.UpdateAsync(secondaryOrder, autoSave: true);
                primaryOrder = secondaryOrder;
            }
            else
            {
                // Cả hai đều có đơn: lấy thông tin giá niêm yết từ CSDL
                var allDishIds = primaryOrder.Items.Select(x => x.DishId)
                    .Concat(secondaryOrder.Items.Select(x => x.DishId))
                    .Distinct()
                    .ToList();
                var dishes = await _dishRepository.GetListAsync(x => allDishIds.Contains(x.Id));
                var dishMap = dishes.ToDictionary(x => x.Id);

                // Ghép items từ secondary sang primary
                foreach (var item in secondaryOrder.Items.ToList())
                {
                    dishMap.TryGetValue(item.DishId, out var dish);
                    var price = dish?.Price ?? item.UnitPrice;

                    var existingItem = primaryOrder.Items.FirstOrDefault(x => x.DishId == item.DishId);
                    if (existingItem != null)
                    {
                        existingItem.Quantity += item.Quantity;
                        existingItem.UnitPrice = price;
                        existingItem.TotalPrice = existingItem.Quantity * price;

                        // Ghép nối ghi chú chế biến: "{primary.Note} | [Gộp từ {secondary.Name}: {secondary.Note}]"
                        if (!string.IsNullOrWhiteSpace(item.Note))
                        {
                            existingItem.Note = string.IsNullOrWhiteSpace(existingItem.Note)
                                ? $"[Gộp từ {secondaryTable.Name}: {item.Note}]"
                                : $"{existingItem.Note} | [Gộp từ {secondaryTable.Name}: {item.Note}]";
                        }
                    }
                    else
                    {
                        var mergedNote = string.IsNullOrWhiteSpace(item.Note)
                            ? $"[Gộp từ {secondaryTable.Name}]"
                            : $"[Gộp từ {secondaryTable.Name}: {item.Note}]";

                        primaryOrder.Items.Add(new OrderItem(GuidGenerator.Create())
                        {
                            OrderId = primaryOrder.Id,
                            DishId = item.DishId,
                            Quantity = item.Quantity,
                            UnitPrice = price,
                            TotalPrice = item.Quantity * price,
                            Note = mergedNote
                        });
                    }
                }

                // Cập nhật lại giá cho các món ban đầu của primaryOrder theo giá niêm yết
                foreach (var pItem in primaryOrder.Items)
                {
                    if (dishMap.TryGetValue(pItem.DishId, out var d))
                    {
                        pItem.UnitPrice = d.Price;
                        pItem.TotalPrice = pItem.Quantity * d.Price;
                    }
                }

                primaryOrder.RecalculateTotalAmount();
                primaryOrder.Note = string.IsNullOrWhiteSpace(primaryOrder.Note)
                    ? $"[Gộp từ {secondaryTable.Name} (#{secondaryOrder.OrderNumber})]"
                    : $"{primaryOrder.Note} | [Gộp từ {secondaryTable.Name} (#{secondaryOrder.OrderNumber})]";
                await _orderRepository.UpdateAsync(primaryOrder, autoSave: true);

                // Đóng đơn hàng bàn phụ an toàn bằng Cancel
                secondaryOrder.Cancel();
                secondaryOrder.Note = $"[Đã gộp vào {primaryTable.Name} (#{primaryOrder.OrderNumber})]";
                await _orderRepository.UpdateAsync(secondaryOrder, autoSave: true);
            }
        }

        // Giải phóng Bàn phụ về Cleaning
        secondaryTable.MarkCleaning();
        await _tableRepository.UpdateAsync(secondaryTable, autoSave: true);

        // Phát sự kiện SignalR sau khi commit UoW
        CurrentUnitOfWork?.OnCompleted(async () =>
        {
            await _realtimeNotifier.NotifyTableStatusChangedAsync(secondaryTable.Id, secondaryTable.Status, secondaryTable.Name, secondaryTable.DiningAreaId, null);
            await _realtimeNotifier.NotifyTableOrderUpdatedAsync(secondaryTable.Id, false, null);

            if (primaryOrder != null)
            {
                await _realtimeNotifier.NotifyTableOrderUpdatedAsync(primaryTable.Id, true, primaryOrder.Id);
            }
        });

        var primaryDto = ObjectMapper.Map<RestaurantTable, TableDto>(primaryTable);
        if (string.IsNullOrWhiteSpace(primaryDto.DiningAreaName))
        {
            primaryDto.DiningAreaName = primaryTable.Location;
        }
        if (primaryOrder != null)
        {
            primaryDto.ActiveOrderId = primaryOrder.Id;
            primaryDto.HasActiveOrder = true;
        }

        return primaryDto;
    }
}

