# Thiết kế Mô hình Dữ liệu (Data Model Design): RM-009 Table Reservation Management

**Nhánh Tính năng**: `009-rm-009-table-reservation` | **Ngày**: 2026-10-09  
**Tập tin Đặc tả liên quan**: [spec.md](spec.md) | **Kế hoạch liên quan**: [plan.md](plan.md)

---

## 1. Thực thể Miền (Domain Entities)

### 1.1. Aggregate Root `TableReservation`

- **Mô tả**: Đại diện cho một đơn đặt bàn của khách hàng, lưu giữ toàn bộ vòng đời và dấu vết kiểm toán từ lúc tạo đến khi hoàn tất hoặc hủy.
- **Lớp kế thừa**: `FullAuditedAggregateRoot<Guid>` (hỗ trợ tự động `CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `IsDeleted`, `DeleterId`, `DeletionTime`).
- **Bảng Cơ sở Dữ liệu**: `AppTableReservations`

| Thuộc tính (Property) | Kiểu dữ liệu | Bắt buộc | Ràng buộc / Độ dài | Mô tả |
|---|---|:---:|---|---|
| `Id` | `Guid` | Có | Khóa chính (Primary Key) | Định danh duy nhất của đơn đặt bàn. |
| `TableId` | `Guid` | Có | Khóa ngoại tới `RestaurantTable` | Bàn ăn được chỉ định giữ chỗ. |
| `CustomerName` | `string` | Có | Tối đa 128 ký tự | Họ và tên khách hàng liên hệ đặt bàn. |
| `CustomerPhone` | `string` | Có | Tối đa 20 ký tự | Số điện thoại liên lạc của khách hàng. |
| `ReservationTime` | `DateTime` | Có | Chuẩn UTC / Local Time | Thời gian hẹn khách đến nhận bàn. |
| `GuestCount` | `int` | Có | $1 \le \text{GuestCount} \le \text{Table.Capacity}$ | Số lượng khách hàng dự kiến dùng bữa. |
| `Note` | `string?` | Không | Tối đa 512 ký tự | Ghi chú yêu cầu đặc biệt của khách hàng. |
| `Status` | `ReservationStatus` | Có | Enum (1..4) | Trạng thái hiện tại của đơn đặt bàn. |

---

### 1.2. Kiểu Liệt kê `ReservationStatus` (Enum)

- **Vị trí**: `Acme.TooHungry.Domain.Shared.Tables` (hoặc `Reservations`)

```csharp
namespace Acme.TooHungry.Reservations;

public enum ReservationStatus
{
    Confirmed = 1,      // Đã xác nhận / Đang giữ chỗ (Bàn ở trạng thái RESERVED)
    Completed = 2,      // Khách đã đến nhận bàn (Bàn chuyển sang OCCUPIED)
    Cancelled = 3,      // Đã hủy thủ công bởi nhân viên/quản lý (Bàn chuyển về AVAILABLE)
    AutoCancelled = 4   // Hệ thống tự động hủy do quá hạn 1 giờ (Bàn chuyển về AVAILABLE)
}
```

---

### 1.3. Đồng bộ với Thực thể `RestaurantTable` (Bàn ăn)

- **Mô tả**: Bàn ăn vật lý trong nhà hàng, chứa các thuộc tính denormalized để phục vụ hiển thị thời gian thực siêu tốc trên sơ đồ bàn `/waiter/tables`.
- **Lớp kế thừa**: `FullAuditedAggregateRoot<Guid>`
- **Các trường phục vụ Đặt bàn (Reservation Fields)**:

```csharp
public class RestaurantTable : FullAuditedAggregateRoot<Guid>
{
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; } = 4;
    public TableStatus Status { get; set; } = TableStatus.Available;
    public Guid? DiningAreaId { get; set; }
    public DiningArea? DiningArea { get; set; }
    public string? Location { get; set; }

    // Reservation Active Info
    public string? ReservedCustomerName { get; set; }
    public string? ReservedCustomerPhone { get; set; }
    public DateTime? ReservedTime { get; set; }
    public int? ReservedGuestCount { get; set; }
    public string? ReservedNote { get; set; }

    public ICollection<TableReservation> Reservations { get; set; } = new List<TableReservation>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
```

---

## 2. Chu kỳ Vòng đời & Chuyển đổi Trạng thái (State Transitions)

```text
                  +----------------------------------------------+
                  |  [Bàn trống: AVAILABLE]                     |
                  +----------------------------------------------+
                                         |
                                         | 1. Waiter bấm [Đặt bàn]
                                         v
                  +----------------------------------------------+
                  |  [Đã đặt bàn: RESERVED]                      |
                  |  - Table: Reserved info populated            |
                  |  - Reservation: Status = Confirmed           |
                  +----------------------------------------------+
                        |                 |                 |
     2. Bấm [Đón khách] |  3. Bấm [Hủy]   |  4. Quá hạn 1h  |
                        v                 v                 v
+-----------------------------+  +--------------------------------+
| [Bàn có khách: OCCUPIED]    |  | [Bàn trống: AVAILABLE]         |
| - Table: Clear reserved info|  | - Table: Clear reserved info   |
| - Reservation: Completed    |  | - Reservation: Cancelled       |
| - Bắt đầu gọi món (RM-010)  |  |   hoặc AutoCancelled           |
+-----------------------------+  +--------------------------------+
```

---

## 3. Quy tắc Nghiệp vụ & Bất biến (Domain Invariants)

1. **Khung giờ hoạt động hợp lệ**:
   - `ReservationTime` phải nằm trong khung giờ từ **09:00 đến 22:59** hàng ngày.
   - Không được tạo hoặc sửa giờ nhận bàn trước 09:00 hoặc từ 23:00 trở đi.
2. **Thời gian đặt trước hợp lệ**:
   - `ReservationTime >= DateTime.UtcNow` (không được đặt trong quá khứ).
   - `ReservationTime <= DateTime.UtcNow.Date.AddDays(7).AddHours(23).AddMinutes(59).AddSeconds(59)` (tối đa 7 ngày tới).
3. **Sức chứa chỗ ngồi**:
   - `1 <= GuestCount <= Table.Capacity`. Số khách không được vượt quá sức chứa tối đa của bàn.
4. **Trạng thái bàn khi đặt**:
   - Bàn chỉ cho phép tạo đơn đặt bàn mới khi `Table.Status == TableStatus.Available`.
5. **Cố định bàn khi chỉnh sửa**:
   - Khi chỉnh sửa đơn đặt bàn, `TableId` là bất biến. Không cho phép đổi sang bàn khác (muốn đổi bàn phải hủy đơn cũ và đặt trên bàn mới).
6. **Không chặn trùng lặp số điện thoại**:
   - Một số điện thoại được phép đặt nhiều bàn khác nhau.

---

## 4. Thiết kế Chỉ mục Cơ sở Dữ liệu (Database Indexes)

Để tối ưu hóa hiệu năng truy vấn cho Background Worker và giao diện người dùng:

1. **`IX_AppTableReservations_Status_ReservationTime`**:
   - Cột: `(Status, ReservationTime)`
   - Mục đích: Tối ưu hóa truy vấn quét định kỳ của Background Worker mỗi 5 phút để tìm các đơn `Status == Confirmed` và `ReservationTime <= Now - 1h`.
2. **`IX_AppTableReservations_TableId_Status`**:
   - Cột: `(TableId, Status)`
   - Mục đích: Tìm kiếm nhanh đơn đặt bàn đang active (`Confirmed`) của một bàn ăn cụ thể khi nhân viên nhấp xem chi tiết trên sơ đồ bàn.
3. **`IX_AppTableReservations_ReservationTime`**:
   - Cột: `(ReservationTime DESC)`
   - Mục đích: Sắp xếp danh sách lịch sử đặt bàn theo ngày giờ nhận bàn gần nhất.
