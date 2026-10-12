# Hợp đồng Giao diện & API (Interface & API Contracts): RM-009 Table Reservation Management

**Nhánh Tính năng**: `009-rm-009-table-reservation` | **Ngày**: 2026-10-09  
**Tập tin Đặc tả liên quan**: [spec.md](../spec.md) | **Kế hoạch liên quan**: [plan.md](../plan.md)

---

## 1. Hợp đồng Dịch vụ Ứng dụng (Application Service Contract)

- **Vị trí**: `src/Acme.TooHungry.Application.Contracts/Reservations/ITableReservationAppService.cs`
- **Kế thừa**: `IApplicationService`

```csharp
using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Acme.TooHungry.Reservations;

public interface ITableReservationAppService : IApplicationService
{
    Task<TableReservationDto> CreateAsync(CreateTableReservationDto input);

    Task<TableReservationDto> GetAsync(Guid id);

    Task<TableReservationDto?> GetActiveByTableIdAsync(Guid tableId);

    Task<TableReservationDto> UpdateAsync(Guid id, UpdateTableReservationDto input);

    Task<TableReservationDto> CheckInAsync(Guid id);

    Task<TableReservationDto> CancelAsync(Guid id);

    Task<PagedResultDto<TableReservationDto>> GetListAsync(GetTableReservationsInput input);
}
```

---

## 2. Các Đối tượng Chuyển giao Dữ liệu (DTOs)

### 2.1. `CreateTableReservationDto`

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Acme.TooHungry.Reservations;

public class CreateTableReservationDto
{
    [Required]
    public Guid TableId { get; set; }

    [Required]
    [StringLength(128)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 8)]
    [Phone]
    public string CustomerPhone { get; set; } = string.Empty;

    [Required]
    public DateTime ReservationTime { get; set; }

    [Required]
    [Range(1, 100)]
    public int GuestCount { get; set; }

    [StringLength(512)]
    public string? Note { get; set; }
}
```

### 2.2. `UpdateTableReservationDto`

> **Lưu ý**: `TableId` là bất biến, không nằm trong DTO này theo quyết định đã chốt tại Clarification.

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace Acme.TooHungry.Reservations;

public class UpdateTableReservationDto
{
    [Required]
    [StringLength(128)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 8)]
    [Phone]
    public string CustomerPhone { get; set; } = string.Empty;

    [Required]
    public DateTime ReservationTime { get; set; }

    [Required]
    [Range(1, 100)]
    public int GuestCount { get; set; }

    [StringLength(512)]
    public string? Note { get; set; }
}
```

### 2.3. `TableReservationDto`

```csharp
using System;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Reservations;

public class TableReservationDto : FullAuditedEntityDto<Guid>
{
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public DateTime ReservationTime { get; set; }
    public int GuestCount { get; set; }
    public string? Note { get; set; }
    public ReservationStatus Status { get; set; }
}
```

### 2.4. `GetTableReservationsInput`

```csharp
using System;
using Volo.Abp.Application.Dtos;

namespace Acme.TooHungry.Reservations;

public class GetTableReservationsInput : PagedAndSortedResultRequestDto
{
    public string? Filter { get; set; }
    public Guid? TableId { get; set; }
    public ReservationStatus? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
```

---

## 3. Endpoints REST API (`HttpApi.Host`)

| Phương thức | Đường dẫn Endpoint | Quyền hạn (Permission) | Mô tả |
|:---:|---|---|---|
| `POST` | `/api/app/table-reservations` | `TooHungryPermissions.Reservations.Create` | Tạo đơn đặt bàn từ bàn `AVAILABLE`, chuyển bàn sang `RESERVED`. |
| `GET` | `/api/app/table-reservations/{id}` | `TooHungryPermissions.Reservations.Default` | Xem chi tiết một đơn đặt bàn theo ID. |
| `GET` | `/api/app/table-reservations/by-table/{tableId}` | `TooHungryPermissions.Reservations.Default` | Lấy đơn đặt bàn đang active (`Confirmed`) của bàn. |
| `PUT` | `/api/app/table-reservations/{id}` | `TooHungryPermissions.Reservations.Update` | Cập nhật thông tin đơn đặt bàn (Tên, SĐT, Giờ hẹn, Số khách, Ghi chú). |
| `POST` | `/api/app/table-reservations/{id}/check-in` | `TooHungryPermissions.Reservations.CheckIn` | Đón khách nhận bàn, chuyển đơn sang `Completed` và bàn sang `OCCUPIED`. |
| `POST` | `/api/app/table-reservations/{id}/cancel` | `TooHungryPermissions.Reservations.Cancel` | Hủy đặt bàn thủ công, chuyển đơn sang `Cancelled` và bàn về `AVAILABLE`. |
| `GET` | `/api/app/table-reservations` | `TooHungryPermissions.Reservations.Default` | Truy vấn danh sách lịch sử đặt bàn có phân trang và lọc. |

---

## 4. Hợp đồng Thời gian thực (SignalR Real-time Contract)

- **Hub Endpoint**: `/signalr-hubs/table` (Tái sử dụng Hub từ RM-008)
- **Tên Sự kiện**: `TableStatusChanged`
- **Payload**:

```typescript
export interface TableStatusChangedMessage {
  tableId: string;
  tableName: string;
  diningAreaId?: string;
  status: TableStatus; // AVAILABLE (0), OCCUPIED (1), RESERVED (2), CLEANING (3), INACTIVE (4)
  reservedCustomerName?: string;
  reservedCustomerPhone?: string;
  reservedTime?: string;
  reservedGuestCount?: number;
  reservedNote?: string;
}
```

---

## 5. Cấu hình Quyền hạn ABP (Authorization Permissions)

- **Vị trí**: `src/Acme.TooHungry.Application.Contracts/Permissions/TooHungryPermissions.cs`

```csharp
public static class TooHungryPermissions
{
    public static class Reservations
    {
        public const string Default = GroupName + ".Reservations";
        public const string Create = Default + ".Create";
        public const string Update = Default + ".Update";
        public const string Cancel = Default + ".Cancel";
        public const string CheckIn = Default + ".CheckIn";
    }
}
```
