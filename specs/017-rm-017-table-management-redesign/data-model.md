# Thiết kế Mô hình Dữ liệu, Trạng thái & Giao diện: RM-017 Làm lại trang Quản lý bàn

**Tính năng**: `RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign)`  
**Ngày**: 2026-10-16  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Các Mô hình Truyền Dữ liệu Backend (Backend DTOs)

### `TransferTableInputDto`
Dữ liệu gửi lên khi yêu cầu chuyển bàn:

```csharp
namespace Acme.TooHungry.Tables;

public class TransferTableInputDto
{
    /// <summary>
    /// Id của bàn nguồn (bàn đang có khách ngồi)
    /// </summary>
    public Guid SourceTableId { get; set; }

    /// <summary>
    /// Id của bàn đích (bàn trống muốn chuyển sang)
    /// </summary>
    public Guid TargetTableId { get; set; }

    /// <summary>
    /// Ghi chú chuyển bàn (tùy chọn)
    /// </summary>
    public string? Note { get; set; }
}
```

### `MergeTablesInputDto`
Dữ liệu gửi lên khi yêu cầu gộp bàn:

```csharp
namespace Acme.TooHungry.Tables;

public class MergeTablesInputDto
{
    /// <summary>
    /// Id của bàn chính (bàn giữ lại để tính tiền chung)
    /// </summary>
    public Guid PrimaryTableId { get; set; }

    /// <summary>
    /// Id của bàn phụ (bàn gộp món sang bàn chính và giải phóng)
    /// </summary>
    public Guid SecondaryTableId { get; set; }

    /// <summary>
    /// Ghi chú gộp bàn (tùy chọn)
    /// </summary>
    public string? Note { get; set; }
}
```

---

## 2. Các Mô hình Trạng thái Giao diện (Frontend Reactive Signals & Models)

### Mô hình Trạng thái Quản lý Bàn (`TableManagementState`)
```typescript
export interface TableManagementState {
  tables: TableDto[];
  diningAreas: DiningAreaDto[];
  selectedAreaId: string | null;
  selectedStatus: number | null;
  searchQuery: string;
  viewMode: 'grid' | 'table';
  currentTime: number;
}
```

### Phân cấp Cảnh báo Thời lượng Dùng bữa (`MealDurationAlertTier`)
```typescript
export type MealDurationAlertTier = 'normal' | 'warning' | 'long';

export interface MealDurationInfo {
  minutes: number;
  displayText: string;
  tier: MealDurationAlertTier;
  badgeClass: 'badge-meal-normal' | 'badge-meal-warning' | 'badge-meal-long';
}
```

---

## 3. Từ điển Khóa Quốc tế hóa & Song ngữ (i18n Keys Dictionary)

Cập nhật vào cả 2 tệp `angular/src/assets/i18n/vi.json` và `en.json`:

| Khóa i18n | Tiếng Việt (`vi.json`) | Tiếng Anh (`en.json`) |
|---|---|---|
| `::TransferTable` | Chuyển bàn | Transfer Table |
| `::TransferTableTitle` | Chuyển Bàn Ăn | Transfer Dining Table |
| `::TransferTableDesc` | Chuyển khách và toàn bộ đơn hàng sang một bàn trống mới | Move guests and all active orders to a new available table |
| `::SourceTable` | Bàn hiện tại | Current Table |
| `::TargetTable` | Bàn chuyển đến | Destination Table |
| `::SelectTargetTable` | Chọn bàn chuyển đến... | Select destination table... |
| `::ConfirmTransferTable` | Xác nhận chuyển bàn | Confirm Transfer |
| `::TransferTableSuccess` | Chuyển bàn thành công! | Table transferred successfully! |
| `::MergeTables` | Gộp bàn | Merge Tables |
| `::MergeTablesTitle` | Gộp Bàn Ăn | Merge Dining Tables |
| `::MergeTablesDesc` | Gộp món ăn từ bàn phụ sang bàn chính để thanh toán 1 hóa đơn | Combine items from secondary table to primary table for single bill |
| `::PrimaryTable` | Bàn chính (Thanh toán) | Primary Table (Billing) |
| `::SecondaryTable` | Bàn phụ (Cần gộp) | Secondary Table (To Merge) |
| `::SelectSecondaryTable` | Chọn bàn cần gộp... | Select table to merge... |
| `::ConfirmMergeTables` | Xác nhận gộp bàn | Confirm Merge |
| `::MergeTablesSuccess` | Gộp bàn thành công! | Tables merged successfully! |
| `::TableMealStartedAt` | Bắt đầu dùng bữa | Meal Started At |
| `::TableMealEndedAt` | Thời điểm kết thúc | Meal Ended At |
| `::TableMealSession` | Phiên dùng bữa | Dining Session |
| `::TableDiningDuration` | Thời gian dùng bữa | Dining Duration |
| `::MealDurationNormal` | Thời gian bình thường | Normal Duration |
| `::MealDurationCare` | Cần chăm sóc khách (≥ 60 phút) | Guest Care Needed (≥ 60m) |
| `::MealDurationOverstay` | Bàn ngồi lâu (≥ 90 phút) | Overstay Alert (≥ 90m) |
| `::MinutesShort` | phút | mins |
| `::CapacityWarning` | Sức chứa bàn mới nhỏ hơn số khách hiện tại | Destination table capacity is smaller than current guests |
| `::TargetTableOccupiedError` | Bàn đích đã có khách sử dụng, vui lòng chọn bàn khác! | Destination table is already occupied, please choose another! |
