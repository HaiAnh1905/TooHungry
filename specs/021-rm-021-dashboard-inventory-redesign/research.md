# Nghiên cứu Kỹ thuật (Technical Research): RM-021 Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)

**Tính năng**: `RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)`  
**Nhánh**: `021-rm-021-dashboard-inventory-redesign` | **Ngày**: 2026-10-20 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Phân rã Component Monolithic & Quản lý Trạng thái bằng Angular Signals

### Vấn đề Kỹ thuật
Hiện tại, `InventoryComponent` (`inventory.component.ts` ~957 dòng và `inventory.component.html` ~1161 dòng) là một component nguyên khối rất lớn. Nó ôm đồm toàn bộ logic của:
- 4 thẻ KPI chỉ số kho tổng quan và băng rôn cảnh báo.
- Tab 1: Quản lý danh mục Nguyên liệu, lọc điều kiện bảo quản, tính thanh tiến trình tồn an toàn.
- Tab 2: Quản lý chi tiết Lô hàng, lọc hạn dùng FEFO, tính số ngày còn lại, gọi API khóa/mở khóa lô (RM-013).
- Tab 3: Nhật ký biến động xuất nhập tồn và form kiểm kê điều chỉnh cân đối kho.
- 5 modal nghiệp vụ được nhúng trực tiếp trong cùng một file template.

Sự tập trung quá mức này gây ra:
1. Khó bảo trì, nguy cơ hồi quy cao khi sửa đổi một tính năng.
2. Hiệu năng render giảm do Angular phải kiểm tra thay đổi (`change detection`) trên cây DOM quá sâu.
3. Không thể chia sẻ URL hoặc bookmark trực tiếp đến một Tab cụ thể.

### Giải pháp Kiến trúc
Áp dụng **Mô hình Phân rã Mô-đun (Modular Sub-components)** với Angular Standalone Components và Signal Reactive State:

```text
                  InventoryComponent (/inventory?tab=...)
                                     │
     ┌───────────────────────────────┼───────────────────────────────┐
     ▼                               ▼                               ▼
InventoryKpiBar             InventoryAlertsBanner       [Dynamic Active Tab Component]
(4 thẻ Bento KPI)         (Băng rôn cảnh báo khẩn cấp)                 │
                                               ┌───────────────────────┼───────────────────────┐
                                               ▼                       ▼                       ▼
                                   InventoryIngredientTab      InventoryBatchTab     InventoryTransactionTab
                                   (?tab=ingredients)          (?tab=batches)        (?tab=transactions)
```

1. **Đồng bộ Tab qua Query Parameter**:
   - Lắng nghe `route.queryParamMap`:
     ```typescript
     readonly activeTab = toSignal(
       this.route.queryParamMap.pipe(
         map(params => (params.get('tab') as 'ingredients' | 'batches' | 'transactions') || 'ingredients')
       ),
       { initialValue: 'ingredients' }
     );
     ```
   - Chuyển tab bằng:
     ```typescript
     changeTab(tab: 'ingredients' | 'batches' | 'transactions'): void {
       this.router.navigate([], {
         relativeTo: this.route,
         queryParams: { tab },
         queryParamsHandling: 'merge'
       });
     }
     ```
2. **Chiến lược Kiểm tra Thay đổi (`ChangeDetectionStrategy.OnPush`)**:
   - Áp dụng `OnPush` trên tất cả các sub-components. Dữ liệu được truyền qua `@Input()` dạng Signals hoặc immutable DTOs, giúp Angular bỏ qua việc quét lại các nhánh DOM không thay đổi.

---

## 2. Trực quan hóa Hạn dùng FEFO (Timeline & Visual Status Badges)

### Vấn đề Kỹ thuật
Quản lý nhà hàng cần phát hiện ngay lô hàng nào sắp hết hạn trong 7 ngày tới để ưu tiên bếp xuất chế biến theo nguyên tắc FEFO (First-Expired, First-Out), và lô nào đã quá hạn cần lập biên bản xuất hủy ngay. Giao diện cũ hiển thị ngày hết hạn thô sơ, buộc người dùng phải tự nhẩm tính ngày.

### Giải pháp Kiến trúc
Xây dựng tiện ích tính toán và trực quan hóa hạn sử dụng FEFO:
1. **Phân loại 4 Trạng thái Hạn dùng & Vòng đời**:
   - `LOCKED` (Đã khóa tạm ngưng theo RM-013): Badge màu tím xám `#7C3AED` kèm tooltip lý do khóa.
   - `EXPIRED` (Đã hết hạn, `daysRemaining <= 0`): Badge màu đỏ rực `#DC2626` kèm nhãn *"Quá hạn X ngày - Cần xuất hủy"*.
   - `EXPIRING_SOON` (Cận date, `1 <= daysRemaining <= 7`): Badge màu vàng cam `#D97706` kèm nhãn *"Còn X ngày"*.
   - `SAFE` (An toàn, `daysRemaining > 7`): Badge màu xanh lá `#16A34A` kèm nhãn *"Còn X ngày"*.
2. **Thanh Tiến trình Vòng đời Lô hàng (Batch Expiration Progress Bar)**:
   - Tính tỷ lệ thời gian đã trôi qua:
     $$\text{Elapsed \%} = \frac{\text{Today} - \text{InboundDate}}{\text{ExpirationDate} - \text{InboundDate}} \times 100\%$$
   - Hiển thị thanh mini progress bar mảnh (4px) bo tròn với dải màu chuyển mượt từ xanh sang cam và đỏ.

---

## 3. Tích hợp Thông tin Dự báo (RM-014) qua `ReplenishmentInsightsWidget`

### Vấn đề Kỹ thuật
Người quản lý khi xem tồn kho thường xuyên phải chuyển sang màn hình `/forecasts` để xem danh sách nguyên liệu cần mua, sau đó quay lại `/inventory` để bấm tạo lô hàng mới và gõ lại từng số lượng. Quy trình này phân mảnh và tốn thời gian.

### Giải pháp Kiến trúc
Xây dựng thẻ tiện ích thông minh **`ReplenishmentInsightsWidget`**:
1. **Kết nối Dữ liệu**:
   - Tận dụng `IngredientPlanAppService` từ RM-014 để lấy kế hoạch nguyên liệu mới nhất.
   - So sánh giữa `CurrentStock` khả dụng và số lượng đề xuất mua thêm (`SuggestedQuantity`).
2. **Tác vụ 1-Click Nhập Lô Nhanh**:
   - Khi bấm nút `[+ Nhập hàng]` trên từng dòng gợi ý của widget:
     - Hệ thống kích hoạt `CreateInventoryBatchModalComponent`.
     - Tự động truyền sẵn: `ingredientId`, ngày nhập là hôm nay, và số lượng đề xuất mua (`SuggestedQuantity`).
     - Quản lý chỉ cần kiểm tra lại đơn giá thực tế từ hóa đơn nhà cung cấp và bấm `[Lưu]`.

---

## 4. Chuẩn hóa Modal theo Bento Design System & Tái sử dụng Đa Phân hệ

### Vấn đề Kỹ thuật
Hiện tại, cả Dashboard (`/inventory`) và Quầy kho (`/inventory-keeper` - RM-020) đều cần các thao tác: Nhập lô mới, Xuất hủy lô, Điều chỉnh kiểm kê và Xem chi tiết lô. Nếu mỗi phân hệ tự xây dựng modal riêng sẽ gây phân mảnh mã nguồn, lệch giao diện và tăng chi phí bảo trì.

### Giải pháp Kiến trúc
1. **Độc lập hóa 4 Modal Nghiệp vụ Kho**:
   - `CreateInventoryBatchModalComponent`: Form nhập lô mới với `CustomSelect` tìm kiếm nguyên liệu, định dạng số lượng theo đơn vị tính chuẩn kho, tính thành tiền tự động.
   - `DiscardBatchModalComponent`: Hộp thoại xuất hủy lô quá hạn với lý do mẫu (Hết hạn, Hư hỏng, Mất phẩm chất, Khác).
   - `StockAdjustmentModalComponent`: Form kiểm kê cân đối tồn kho thực tế, tự tính số lượng chênh lệch (Delta).
   - `IngredientBatchesModalComponent`: Modal tra cứu chi tiết toàn bộ các lô của một mặt hàng nguyên liệu.
2. **Chuẩn hóa Giao diện Bento**:
   - Header cam thương hiệu `#EA580C`, bo góc `rounded-2xl`, bóng đổ `shadow-xl`, viền kính nhẹ `backdrop-blur`.
   - Bắt sự kiện bàn phím: Phím `Esc` đóng an toàn, phím `Enter` submit form khi hợp lệ.
   - Dùng chung 100% giữa `/inventory` và `/inventory-keeper`.

---

## 5. Tối ưu Hiệu năng Tìm kiếm & Lọc Dữ liệu

### Giải pháp Kiến trúc
- Sử dụng RxJS `Subject` kết hợp toán tử:
  ```typescript
  searchTerm$
    .pipe(
      debounceTime(250),
      distinctUntilChanged()
    )
    .subscribe(term => {
      this.filterData(term);
    });
  ```
- Lọc trực tiếp trên danh sách cached client-side đối với danh mục nguyên liệu hiện tại, chỉ gọi API tải lại khi có sự kiện thay đổi dữ liệu (Nhập lô, Hủy lô, Khóa lô, Kiểm kê), giảm tải 80% số lượng request lên server.
