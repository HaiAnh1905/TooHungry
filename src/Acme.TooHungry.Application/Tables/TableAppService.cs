using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Acme.TooHungry.DiningAreas;
using Acme.TooHungry.Orders;

namespace Acme.TooHungry.Tables;

[Authorize]
public class TableAppService : TooHungryAppService, ITableAppService
{
    private readonly IRepository<RestaurantTable, Guid> _tableRepository;
    private readonly IRepository<Order, Guid> _orderRepository;
    private readonly IRepository<DiningArea, Guid> _diningAreaRepository;

    public TableAppService(
        IRepository<RestaurantTable, Guid> tableRepository,
        IRepository<Order, Guid> orderRepository,
        IRepository<DiningArea, Guid> diningAreaRepository)
    {
        _tableRepository = tableRepository;
        _orderRepository = orderRepository;
        _diningAreaRepository = diningAreaRepository;
    }

    /// <summary>
    /// Lấy thông tin chi tiết một bàn ăn theo Id (kèm thông tin Khu vực ăn uống liên kết)
    /// </summary>
    /// <param name="id">Id của bàn ăn</param>
    /// <returns>Thông tin chi tiết bàn ăn dạng DTO</returns>
    public virtual async Task<TableDto> GetAsync(Guid id)
    {
        // Truy vấn bàn ăn kèm thông tin liên kết của DiningArea
        var table = (await _tableRepository.WithDetailsAsync(x => x.DiningArea)).FirstOrDefault(x => x.Id == id)
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
        }

        return new PagedResultDto<TableDto>(totalCount, dtos);
    }

    /// <summary>
    /// Tạo mới một bàn ăn trong nhà hàng
    /// </summary>
    /// <param name="input">Thông tin bàn ăn cần tạo</param>
    /// <returns>Thông tin bàn ăn vừa tạo</returns>
    public virtual async Task<TableDto> CreateAsync(CreateUpdateTableDto input)
    {
        // 1. Chuẩn hóa tên bàn
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException("Tên hoặc số bàn không được để trống!");
        }

        // 2. Guard: Kiểm tra trùng tên bàn
        var isExist = await _tableRepository.AnyAsync(x => x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Bàn '{cleanName}' đã tồn tại trong danh sách!");
        }

        var table = ObjectMapper.Map<CreateUpdateTableDto, RestaurantTable>(input);
        table.Name = cleanName;

        // 3. Tự động đồng bộ trường Location theo Khu vực được chọn
        if (input.DiningAreaId.HasValue)
        {
            var area = await _diningAreaRepository.FindAsync(input.DiningAreaId.Value);
            table.Location = area?.Name;
        }
        else if (!string.IsNullOrWhiteSpace(input.Location))
        {
            var area = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name.ToLower() == input.Location.Trim().ToLower());
            if (area != null)
            {
                table.DiningAreaId = area.Id;
                table.Location = area.Name;
            }
        }

        // 4. Lưu vào cơ sở dữ liệu
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
    public virtual async Task<TableDto> UpdateAsync(Guid id, CreateUpdateTableDto input)
    {
        var cleanName = input.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new UserFriendlyException("Tên hoặc số bàn không được để trống!");
        }

        // Guard 1: Kiểm tra trùng tên bàn với bàn khác
        var isExist = await _tableRepository.AnyAsync(x => x.Id != id && x.Name.ToLower() == cleanName.ToLower());
        if (isExist)
        {
            throw new UserFriendlyException($"Bàn '{cleanName}' đã tồn tại trong danh sách!");
        }

        var table = await _tableRepository.GetAsync(id);

        // Guard 2: Khi bàn đang sử dụng (Occupied) thì không được phép chỉnh sửa thông tin bàn
        if (table.Status == TableStatus.Occupied)
        {
            var isInfoChanged = table.Name != cleanName
                || table.Capacity != input.Capacity
                || table.DiningAreaId != input.DiningAreaId
                || (table.Location ?? string.Empty) != (input.Location ?? string.Empty);

            if (isInfoChanged)
            {
                throw new UserFriendlyException("Bàn đang được sử dụng (có khách), không được phép chỉnh sửa thông tin bàn!");
            }

            if (input.Status != TableStatus.Occupied && input.Status != TableStatus.Available)
            {
                throw new UserFriendlyException("Bàn đang có khách sử dụng! Vui lòng kết thúc bữa ăn hoặc thanh toán trước khi thay đổi trạng thái bàn.");
            }
        }

        // Guard 3: Kiểm tra tính hợp lệ của thời gian đặt bàn (không được trong quá khứ & trong khung giờ nhận đặt 08:00 - 22:00, đóng cửa 23:00)
        if (input.Status == TableStatus.Reserved && input.ReservedTime.HasValue)
        {
            var reservedTime = input.ReservedTime.Value;
            if (reservedTime < DateTime.Now.AddMinutes(-5))
            {
                throw new UserFriendlyException("Thời gian đặt bàn không được ở trong quá khứ!");
            }

            var timeOfDay = reservedTime.TimeOfDay;
            if (timeOfDay < TimeSpan.FromHours(8) || timeOfDay > TimeSpan.FromHours(22))
            {
                throw new UserFriendlyException("Nhà hàng chỉ nhận đặt bàn từ 08:00 đến 22:00 (nhà hàng đóng cửa lúc 23:00)!");
            }
        }

        ObjectMapper.Map(input, table);
        table.Name = cleanName;

        // Đồng bộ trường Location theo DiningArea được chọn
        if (input.DiningAreaId.HasValue)
        {
            var area = await _diningAreaRepository.FindAsync(input.DiningAreaId.Value);
            table.Location = area?.Name;
        }
        else if (!string.IsNullOrWhiteSpace(input.Location))
        {
            var area = await _diningAreaRepository.FirstOrDefaultAsync(x => x.Name.ToLower() == input.Location.Trim().ToLower());
            if (area != null)
            {
                table.DiningAreaId = area.Id;
                table.Location = area.Name;
            }
            else
            {
                table.Location = input.Location.Trim();
            }
        }
        else
        {
            table.Location = null;
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
            throw new UserFriendlyException($"Không thể xóa bàn '{table.Name}' vì bàn đang có khách sử dụng!");
        }

        // Guard 2: Không cho phép xóa bàn nếu đang có đơn hàng (Order) liên kết
        var orderCount = await _orderRepository.CountAsync(x => x.TableId == id);
        if (orderCount > 0)
        {
            throw new UserFriendlyException($"Không thể xóa bàn '{table.Name}' vì đang có {orderCount} đơn hàng liên kết với bàn này!");
        }

        await _tableRepository.DeleteAsync(table);
    }

    /// <summary>
    /// Cập nhật trạng thái hàng loạt cho tất cả các bàn trong cùng một khu vực (ví dụ khóa / mở khu vực)
    /// </summary>
    /// <param name="diningAreaId">Id của khu vực ăn uống</param>
    /// <param name="status">Trạng thái mới áp dụng cho toàn bộ bàn trong khu vực</param>
    public virtual async Task SetAreaTablesStatusAsync(Guid diningAreaId, TableStatus status)
    {
        var tables = await _tableRepository.GetListAsync(x => x.DiningAreaId == diningAreaId);
        foreach (var table in tables)
        {
            table.Status = status;

            // Nếu vô hiệu hóa hoặc chuyển về có sẵn thì reset lại thông tin đặt bàn cũ
            if (status == TableStatus.Disabled || status == TableStatus.Available)
            {
                table.ReservedCustomerName = null;
                table.ReservedCustomerPhone = null;
                table.ReservedTime = null;
                table.ReservedGuestCount = null;
                table.ReservedNote = null;
            }
        }

        await _tableRepository.UpdateManyAsync(tables, autoSave: true);
    }
}
