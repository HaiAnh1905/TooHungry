# Mô hình Dữ liệu & Thiết kế Kiến trúc (Data Model & Schema Design): RM-025 Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code

**Mã Tính năng**: `RM-025`  
**Ngày lập**: 2026-10-23  
**Tác giả**: ADAM (Antigravity AI Assistant)  
**Tài liệu Đầu vào**: [spec.md](spec.md), [research.md](research.md)

---

## 1. Thiết kế Thực thể Domain (Rich Domain Entities)

### 1.1. Thực thể `RestaurantTable` (Bàn ăn)
- **Tầng**: `Acme.TooHungry.Domain/Tables/RestaurantTable.cs`
- **Kế thừa**: `FullAuditedAggregateRoot<Guid>`
- **Đóng gói thuộc tính**:
  ```csharp
  public string Name { get; protected set; } = string.Empty;
  public int Capacity { get; protected set; } = 4;
  public TableStatus Status { get; protected set; } = TableStatus.Available;
  public Guid? DiningAreaId { get; protected set; }
  public string? Location { get; protected set; }

  // 5 trường thông tin đặt bàn (được bảo vệ)
  public string? ReservedCustomerName { get; protected set; }
  public string? ReservedCustomerPhone { get; protected set; }
  public DateTime? ReservedTime { get; protected set; }
  public int? ReservedGuestCount { get; protected set; }
  public string? ReservedNote { get; protected set; }
  public DateTime? OccupiedTime { get; protected set; }
  ```
- **Các Phương thức Nghiệp vụ (Domain Methods)**:
  - `Occupy(DateTime occupiedTime)`:
    * Gán `Status = TableStatus.Occupied`
    * Gán `OccupiedTime = occupiedTime`
    * Gọi `ClearReservationInfo()`
  - `Release()`:
    * Gán `Status = TableStatus.Available`
    * Gán `OccupiedTime = null`
    * Gán `ReservedCustomerName = null`, `ReservedCustomerPhone = null`, `ReservedTime = null`, `ReservedGuestCount = null`, `ReservedNote = null`
    * *Thay thế toàn bộ 8 đoạn code reset thủ công rải rác trong hệ thống.*
  - `MarkCleaning()`:
    * Gán `Status = TableStatus.Cleaning`
  - `Reserve(string customerName, string phone, DateTime time, int guestCount, string? note)`:
    * Gán các thông tin đặt bàn và chuyển `Status = TableStatus.Reserved`
  - `SetName(string name)`, `SetCapacity(int capacity)`, `SetArea(Guid? diningAreaId, string? location)`

---

### 1.2. Thực thể `Order` (Đơn hàng)
- **Tầng**: `Acme.TooHungry.Domain/Orders/Order.cs`
- **Kế thừa**: `FullAuditedAggregateRoot<Guid>`
- **Đóng gói thuộc tính**:
  ```csharp
  public string OrderNumber { get; protected set; } = string.Empty;
  public DateTime OrderDate { get; protected set; }
  public OrderStatus Status { get; protected set; } = OrderStatus.Pending;
  public decimal TotalAmount { get; protected set; }
  public string? Note { get; protected set; }
  public Guid? TableId { get; protected set; }
  ```
- **Các Phương thức Nghiệp vụ (Domain Methods)**:
  - `Complete()`: Chuyển `Status = OrderStatus.Completed` (chặn ném exception nếu đã Completed/Cancelled)
  - `Cancel()`: Chuyển `Status = OrderStatus.Cancelled` (chặn ném exception nếu đã Completed/Cancelled)
  - `SetTable(Guid? tableId)`: Cập nhật liên kết bàn ăn
  - `SetOrderNumber(string orderNumber)`: Gán mã số đơn hàng định dạng an toàn
  - `RecalculateTotalAmount()`: Tổng hợp lại `TotalAmount = Items.Sum(i => i.TotalPrice)`

---

### 1.3. Thực thể `Recipe` (Công thức Món ăn) & Quản lý Phiên bản
- **Tầng**: `Acme.TooHungry.Domain/Recipes/Recipe.cs`
- **Kế thừa**: `FullAuditedAggregateRoot<Guid>`
- **Đóng gói thuộc tính**:
  ```csharp
  public Guid DishId { get; protected set; }
  public string Name { get; protected set; } = string.Empty;
  public string? Description { get; set; }
  public int Version { get; protected set; } = 1;
  public bool IsActive { get; protected set; } = true;
  public string? DeactivationReason { get; set; }
  ```
- **Cơ chế Clone Snapshot trong `RecipeManager.cs`**:
  * Khi cập nhật công thức làm thay đổi định lượng hoặc danh sách nguyên liệu:
    1. Kiểm tra 100% nguyên liệu tồn tại và `IsActive == true` qua `_ingredientRepository`.
    2. Tạo thực thể lịch sử snapshot:
       ```csharp
       var historySnapshot = new Recipe(
           GuidGenerator.Create(),
           recipe.DishId,
           recipe.Name,
           recipe.Description,
           recipe.Version
       );
       historySnapshot.Deactivate("Bản lưu vết lịch sử khi nâng lên phiên bản " + (recipe.Version + 1));
       foreach (var ing in recipe.Ingredients)
       {
           historySnapshot.AddIngredient(
               GuidGenerator.Create(),
               ing.IngredientId,
               ing.Quantity,
               ing.Unit,
               ing.ConversionFactor,
               ing.RecipeUnitId
           );
       }
       await _recipeRepository.InsertAsync(historySnapshot, autoSave: true);
       ```
    3. Cập nhật bản ghi chính với định lượng mới, gọi `recipe.BumpVersion()`, duy trì `IsActive = true`.

---

## 2. Cấu hình Lược đồ CSDL EF Core (`TooHungryDbContext.cs`)

### 2.1. Chỉ mục Hiệu năng & Ràng buộc Toàn vẹn (Indexes)
Bổ sung các chỉ mục sau vào `OnModelCreating` trong `Acme.TooHungry.EntityFrameworkCore`:

```csharp
// 1. Chỉ mục hiệu năng cho Orders
builder.Entity<Order>(b =>
{
    // Composite index phục vụ tìm kiếm, báo cáo và lọc đơn hàng theo trạng thái và thời gian
    b.HasIndex(x => new { x.Status, x.OrderDate })
     .HasDatabaseName("IX_AppOrders_Status_OrderDate");

    // Unique index cho mã đơn hàng OrderNumber có lọc soft-delete
    b.HasIndex(x => x.OrderNumber)
     .IsUnique()
     .HasFilter("[IsDeleted] = 0")
     .HasDatabaseName("IX_AppOrders_OrderNumber");
});

// 2. Filtered Unique Index cho Recipe đang hoạt động chống Race Condition
builder.Entity<Recipe>(b =>
{
    b.HasIndex(x => new { x.DishId, x.IsActive })
     .IsUnique()
     .HasFilter("[DishId] IS NOT NULL AND [IsActive] = 1 AND [IsDeleted] = 0")
     .HasDatabaseName("IX_AppRecipes_DishId_IsActive_Unique_Active");
});
```

### 2.2. Tinh giản Cấu hình `AutoInclude`
Xóa bỏ các chỉ thị `AutoInclude()` ở các quan hệ xuyên Aggregate để triệt tiêu over-fetching:

| Thực thể | Quan hệ trước đây | Thay đổi trong RM-025 | Lý do Kiến trúc |
|---|---|---|---|
| `Order` | `b.Navigation(x => x.Table).AutoInclude()` | **GỠ BỎ** | Kéo theo toàn bộ thông tin bàn trong các query đơn hàng nhẹ. Thay bằng `.WithDetailsAsync(x => x.Table)` khi cần. |
| `OrderItem` | `b.Navigation(x => x.Dish).AutoInclude()` | **GỠ BỎ** | Tránh kéo cả cây Dish & Category khi xử lý giỏ hàng. |
| `Dish` | `b.Navigation(x => x.DishCategory).AutoInclude()` | **GỠ BỎ** | Tránh lạm dụng JOIN bảng danh mục khi chỉ cần đọc thông tin món. |
| `RestaurantTable` | `b.Navigation(x => x.DiningArea).AutoInclude()` | **GỠ BỎ** | Tránh kéo bảng khu vực khi chỉ kiểm tra trạng thái bàn (`AnyAsync`, `GetAsync`). |
| `DailyMenuItem` | `b.Navigation(x => x.Dish).AutoInclude()` | **GỠ BỎ** | Tránh JOIN món ăn tự động ngoài phạm vi thực đơn. |
| `InventoryBatch` | `b.Navigation(x => x.Ingredient).AutoInclude()` | **GỠ BỎ** | Tối ưu hóa truy vấn FEFO trừ kho, nạp Ingredient tường minh khi cần. |
| `InventoryTransaction` | `b.Navigation(x => x.Ingredient).AutoInclude()` | **GỠ BỎ** | Tránh nạp tự động bảng nguyên liệu trong các phép đếm giao dịch. |
| **Các Aggregate Children** | `Order.Items`, `Recipe.Ingredients`, `DailyMenu.Items`, `DemandForecast.Items`, `IngredientPlan.Items` | **GIỮ NGUYÊN** | Bắt buộc cho tính toàn vẹn bất biến của Aggregate Root trong DDD. |

---

## 3. Quy ước Sinh Mã Số Nghiệp Vụ An Toàn (Collision-Free Code Generation)

| Loại Mã | Tiền tố | Cấu trúc Thời gian | Hậu tố Ngẫu nhiên | Ví dụ Hoàn chỉnh | Độ dài |
|---|---|---|---|---|---|
| **Đơn hàng (OrderNumber)** | `ORD-` | `yyyyMMddHHmmss` (14 số) | `-` + `RandomHex(4)` | `ORD-20261023140500-A1B2` | 22 ký tự |
| **Lô kho (BatchCode)** | `BATCH-` | `yyyyMMddHHmmss` (14 số) | `-` + `RandomHex(4)` | `BATCH-20261023140500-C3D4` | 24 ký tự |
| **Kiểm kê kho (AdjCode)** | `ADJ-` | `yyyyMMddHHmmss` (14 số) | `-` + `RandomHex(4)` | `ADJ-20261023140500-E5F6` | 22 ký tự |

- **Triển khai C#**:
  ```csharp
  public static class CodeGenerator
  {
      public static string GenerateOrderNumber(DateTime now) =>
          $"ORD-{now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..22].ToUpperInvariant();

      public static string GenerateBatchCode(DateTime now) =>
          $"BATCH-{now:yyyyMMddHHmmss}-{Guid.NewGuid():N}"[..24].ToUpperInvariant();
  }
  ```

---

## 4. Ma trận Ngoại Lệ & Bản Dịch Quốc Tế Hóa (i18n Matrix)

### 4.1. Khai báo Hằng số Mã Lỗi trong `TooHungryDomainErrorCodes.cs`
```csharp
namespace Acme.TooHungry;

public static class TooHungryDomainErrorCodes
{
    // Bàn ăn (Table)
    public const string TableNameRequired = "TooHungry:Table:NameRequired";
    public const string TableInvalidCapacity = "TooHungry:Table:InvalidCapacity";
    public const string TableNameAlreadyExists = "TooHungry:Table:NameAlreadyExists";
    public const string TableAreaInactive = "TooHungry:Table:AreaInactive";
    public const string TableCannotEditOccupied = "TooHungry:Table:CannotEditOccupied";
    public const string TableCannotDeleteOccupied = "TooHungry:Table:CannotDeleteOccupied";
    public const string TableCannotDeleteWithOrders = "TooHungry:Table:CannotDeleteWithOrders";
    public const string TableInactive = "TooHungry:Table:Inactive";
    public const string TableCleaning = "TooHungry:Table:Cleaning";
    public const string TableAlreadyOccupied = "TooHungry:Table:AlreadyOccupied";
    public const string TablePendingPayment = "TooHungry:Table:PendingPayment";
    public const string TableSameSourceAndTarget = "TooHungry:Table:SameSourceAndTarget";
    public const string TableSourceNotOccupied = "TooHungry:Table:SourceNotOccupied";
    public const string TableTargetNotEmpty = "TooHungry:Table:TargetNotEmpty";
    public const string TableBothMustBeOccupied = "TooHungry:Table:BothMustBeOccupied";

    // Món ăn & Danh mục (Dish & Category)
    public const string DishNegativePrice = "TooHungry:Dish:NegativePrice";
    public const string DishNameAlreadyExists = "TooHungry:Dish:NameAlreadyExists";
    public const string DishCategoryCannotDeleteWithDishes = "TooHungry:DishCategory:CannotDeleteWithDishes";
    public const string DishCategoryNameAlreadyExists = "TooHungry:DishCategory:NameAlreadyExists";

    // Đơn vị tính (Unit)
    public const string UnitNameAlreadyExists = "TooHungry:Unit:NameAlreadyExists";
    public const string UnitCannotDeleteDefault = "TooHungry:Unit:CannotDeleteDefault";
    public const string UnitCannotDeleteInUse = "TooHungry:Unit:CannotDeleteInUse";

    // Dự báo & Kế hoạch (Forecast)
    public const string ForecastInvalidDateRange = "TooHungry:Forecast:InvalidDateRange";
    public const string ForecastNegativeQuantity = "TooHungry:Forecast:NegativeQuantity";

    // Công thức (Recipe)
    public const string RecipeIngredientNotActiveOrNotFound = "TooHungry:Recipe:IngredientNotActiveOrNotFound";
    public const string RecipeActiveAlreadyExists = "TooHungry:Recipe:ActiveAlreadyExists";
}
```

### 4.2. Cập nhật Song ngữ Đồng bộ (`vi.json` & `en.json`)

| Mã Lỗi (Error Code) | Bản dịch Tiếng Việt (`vi.json`) | Bản dịch Tiếng Anh (`en.json`) |
|---|---|---|
| `TooHungry:Table:NameRequired` | "Tên hoặc số bàn không được để trống!" | "Table name or number cannot be empty!" |
| `TooHungry:Table:InvalidCapacity` | "Sức chứa bàn ăn phải là số nguyên từ 1 đến 100 chỗ ngồi!" | "Table capacity must be an integer between 1 and 100 seats!" |
| `TooHungry:Table:NameAlreadyExists` | "Bàn '{0}' đã tồn tại trong danh sách!" | "Table '{0}' already exists in the system!" |
| `TooHungry:Table:AreaInactive` | "Khu vực '{0}' đang bị vô hiệu hóa, không thể thêm hoặc chuyển bàn vào khu vực này!" | "Dining area '{0}' is inactive; cannot add or move tables to this area!" |
| `TooHungry:Table:CannotEditOccupied` | "Bàn đang được sử dụng (có khách), không được phép chỉnh sửa thông tin bàn!" | "Table is currently occupied; cannot edit table information!" |
| `TooHungry:Table:CannotDeleteOccupied` | "Không thể xóa bàn '{0}' vì bàn đang có khách sử dụng!" | "Cannot delete table '{0}' because it is currently occupied!" |
| `TooHungry:Table:CannotDeleteWithOrders` | "Không thể xóa bàn '{0}' vì đang có {1} đơn hàng liên kết với bàn này!" | "Cannot delete table '{0}' because there are {1} orders linked to it!" |
| `TooHungry:Table:Inactive` | "Bàn đang bị vô hiệu hóa! Vui lòng kích hoạt bàn trước khi sử dụng." | "Table is inactive! Please activate the table before using." |
| `TooHungry:Table:Cleaning` | "Bàn đang được dọn dẹp! Vui lòng hoàn tất dọn dẹp trước khi tiếp đón khách." | "Table is being cleaned! Please finish cleaning before seating guests." |
| `TooHungry:Table:AlreadyOccupied` | "Trạng thái bàn đã được cập nhật bởi nhân viên khác (Bàn đang có khách phục vụ)!" | "Table status was updated by another staff (Table is currently occupied)!" |
| `TooHungry:Table:PendingPayment` | "Bàn đang có đơn hàng chưa hoàn tất thanh toán! Vui lòng thanh toán trước khi giải phóng bàn." | "Table has an open order pending payment! Please settle payment before releasing the table." |
| `TooHungry:Table:SameSourceAndTarget` | "Bàn đích không được trùng với bàn hiện tại!" | "Target table cannot be the same as the current table!" |
| `TooHungry:Table:SourceNotOccupied` | "Bàn nguồn '{0}' không ở trạng thái đang phục vụ khách!" | "Source table '{0}' is not in occupied status!" |
| `TooHungry:Table:TargetNotEmpty` | "Bàn đích '{0}' không ở trạng thái trống (Đã có khách hoặc đang dọn dẹp)!" | "Target table '{0}' is not available (occupied or being cleaned)!" |
| `TooHungry:Table:BothMustBeOccupied` | "Cả hai bàn cần gộp đều phải ở trạng thái đang phục vụ khách (Occupied)!" | "Both tables to be merged must be in occupied status!" |
| `TooHungry:Dish:NegativePrice` | "Đơn vị giá bán của món ăn không được là số âm!" | "Dish price cannot be negative!" |
| `TooHungry:Dish:NameAlreadyExists` | "Món ăn '{0}' đã tồn tại trong thực đơn!" | "Dish '{0}' already exists in the menu!" |
| `TooHungry:DishCategory:CannotDeleteWithDishes` | "Không thể xóa danh mục vì đang có {0} món ăn trực thuộc! Vui lòng chuyển các món ăn sang danh mục khác trước khi xóa." | "Cannot delete category because {0} dishes are assigned to it! Please reassign dishes before deleting." |
| `TooHungry:DishCategory:NameAlreadyExists` | "Danh mục món ăn '{0}' đã tồn tại trên hệ thống!" | "Dish category '{0}' already exists in the system!" |
| `TooHungry:Unit:NameAlreadyExists` | "Đơn vị tính '{0}' đã tồn tại!" | "Measurement unit '{0}' already exists!" |
| `TooHungry:Unit:CannotDeleteDefault` | "Không thể xóa đơn vị tính mặc định của hệ thống!" | "Cannot delete the default system unit!" |
| `TooHungry:Unit:CannotDeleteInUse` | "Không thể xóa đơn vị tính này vì đang được sử dụng bởi các nguyên liệu trong hệ thống!" | "Cannot delete this unit because it is currently used by ingredients!" |
| `TooHungry:Forecast:InvalidDateRange` | "Ngày bắt đầu không được lớn hơn ngày kết thúc." | "Start date cannot be later than end date." |
| `TooHungry:Forecast:NegativeQuantity` | "Số lượng món dự báo không được là số âm." | "Forecast quantity cannot be negative." |
| `TooHungry:Recipe:IngredientNotActiveOrNotFound` | "Một hoặc nhiều nguyên liệu trong công thức không tồn tại hoặc đang bị vô hiệu hóa!" | "One or more ingredients in the recipe do not exist or are currently inactive!" |
| `TooHungry:Recipe:ActiveAlreadyExists` | "Món ăn này đã có một công thức đang hoạt động! Vui lòng vô hiệu hóa công thức cũ trước khi kích hoạt công thức mới." | "This dish already has an active recipe! Please deactivate the old recipe before activating a new one." |

---

## 5. Cấu trúc Mô hình Truyền tải Dữ liệu (DTO Contracts)

### 5.1. Phân trang Lịch sử Giao dịch Kho
- **Interface**: `IInventoryAppService.cs`
  ```csharp
  Task<PagedResultDto<InventoryTransactionDto>> GetTransactionsAsync(
      Guid ingredientId,
      PagedAndSortedResultRequestDto input);
  ```
- **Hành vi**:
  * Nhận `SkipCount` và `MaxResultCount`.
  * Sắp xếp mặc định: `CreationTime desc`.
  * Trả về `totalCount` chính xác từ CSDL và danh sách giao dịch của trang hiện tại.

### 5.2. Định kiểu Dữ liệu Xu hướng Doanh thu Dashboard
- **Record**: `DashboardAppService.cs`
  ```csharp
  public record OrderTrendSummary(DateTime OrderDate, decimal TotalAmount);
  ```
- **Hành vi**: Thay thế toàn bộ kiểu `dynamic` và ép kiểu runtime `((DateTime)o.OrderDate)`.
