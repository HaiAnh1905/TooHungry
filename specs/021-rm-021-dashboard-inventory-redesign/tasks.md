# Danh sách Công việc Triển khai (Tasks): RM-021 Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)

**Tính năng**: `RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)`  
**Nhánh (Branch)**: `021-rm-021-dashboard-inventory-redesign` | **Ngày**: 2026-10-20  
**Đặc tả (Spec)**: [spec.md](spec.md) | **Kế hoạch (Plan)**: [plan.md](plan.md) | **Hợp đồng (Contracts)**: [contracts/dashboard-inventory-contracts.md](contracts/dashboard-inventory-contracts.md)

---

## Phase 1: Nền tảng Mô hình Dữ liệu, Trạng thái Signals & Định tuyến Query Parameter

**Mục tiêu**: Xây dựng nền tảng mô hình dữ liệu, service trạng thái Signals, cấu hình đồng bộ URL qua Query Parameter `?tab=...` và tinh giản component cha `InventoryComponent` từ 957 dòng xuống < 250 dòng.

- [x] T001 [P] Khởi tạo tệp mô hình dữ liệu `angular/src/app/inventory/models/inventory-dashboard.models.ts`:
  - Khai báo các enum/types: `InventoryTabType` ('ingredients' | 'batches' | 'transactions'), `BatchFefoStatus` (Safe, ExpiringSoon, Expired, Locked), `StockLevelStatus` (Safe, Low, Critical), `StorageFilterType` (All, Chilled, Frozen, Dry)
  - Khai báo các interfaces: `DashboardInventoryKpiSummary`, `ReplenishmentSuggestionItem`, `BatchViewItem`, `InventoryAlertBannerState`
- [x] T002 [US1] Xây dựng service quản lý trạng thái `InventoryStateService` trong `angular/src/app/inventory/services/inventory-state.service.ts`:
  - Quản lý các Angular Signals: `activeTab`, `searchQuery`, `selectedStorage`, `kpiSummary`, `replenishmentSuggestions`, `isLoading`
  - Cung cấp các computed signals: `hasExpiringAlerts`, `hasLowStockAlerts`
  - Quản lý logic tính toán FEFO và lọc dữ liệu client-side
- [x] T003 [US1] Cập nhật component điều phối chính `angular/src/app/inventory/inventory.component.ts`:
  - Tiêm `ActivatedRoute`, `Router`, `InventoryService`, `IngredientService`, `InventoryStateService`
  - Lắng nghe `route.queryParamMap` để đồng bộ URL `?tab=ingredients|batches|transactions`
  - Triển khai hàm `onTabChange(tab)` điều hướng URL mà không reload trang
  - Tải dữ liệu ban đầu song song: `IngredientService.getList()`, `InventoryService.getBatches()`, `InventoryService.getAlerts()`
  - Tái cấu trúc mã nguồn, tinh giản file từ 957 dòng xuống dưới 250 dòng
- [x] T004 [US1, US6] Tái cấu trúc template shell `angular/src/app/inventory/inventory.component.html` và `inventory.component.scss`:
  - Xây dựng thanh Page Header hiện đại: Tiêu đề trang "Quản lý Tồn kho", phụ đề, nút làm mới dữ liệu và nút hành động nổi bật `[Giao diện Thủ kho ↗]` điều hướng sang `/inventory-keeper`
  - Khung vị trí gắn thẻ Bento KPI Bar và Băng rôn Cảnh báo Accordion
  - Thanh chuyển đổi Tab hiện đại (Nguyên liệu, Lô hàng, Nhật ký & Kiểm kê) đồng bộ `activeTab`
  - Vùng hiển thị động sub-components tương ứng với tab đang chọn qua `*ngIf` / `@switch`
  - Style Bento Grid nhận diện Cam & Trắng (`#EA580C`, nền `#F8FAFC`, bề mặt thẻ `#FFFFFF`, viền `#E2E8F0`)

**Trạm kiểm tra (Checkpoint)**: Truy cập `/inventory` hiển thị giao diện shell hiện đại; bấm đổi tab URL thay đổi tương ứng `?tab=batches`, `?tab=transactions`; bấm `[Giao diện Thủ kho ↗]` điều hướng sang `/inventory-keeper`.

---

## Phase 2: Khối 4 Thẻ Bento KPI & Băng rôn Cảnh báo Khẩn cấp

**Mục tiêu**: Hiện thực hóa khối 4 thẻ Bento KPI tổng quan sức khỏe kho và băng rôn cảnh báo ghim đầu trang với cơ chế Accordion mở rộng.

- [x] T005 [US1] Xây dựng component `InventoryKpiBarComponent` trong `angular/src/app/inventory/components/inventory-kpi-bar/`:
  - `inventory-kpi-bar.component.ts`: Cấu hình Standalone, `ChangeDetectionStrategy.OnPush`, `@Input({ required: true }) kpiSummary`, `@Output() selectKpi`
  - `inventory-kpi-bar.component.html`: 4 Thẻ Bento Card:
    + Thẻ 1: Tổng mặt hàng (icon cubes, viền xám)
    + Thẻ 2: Tồn an toàn (icon shield, màu nhấn xanh lá `#16A34A`)
    + Thẻ 3: Cảnh báo thiếu hụt (icon warning, màu nhấn vàng cam `#D97706`)
    + Thẻ 4: Lô quá hạn cần hủy (icon trash/danger, màu nhấn đỏ `#DC2626`)
  - `inventory-kpi-bar.component.scss`: Hiệu ứng hover nổi nhẹ `hover:-translate-y-1 hover:shadow-md`, bo góc `rounded-2xl`
  - Xử lý click thẻ phát sự kiện kích hoạt lọc tương ứng
- [x] T006 [US1] Xây dựng component `InventoryAlertsBannerComponent` trong `angular/src/app/inventory/components/inventory-alerts-banner/`:
  - `inventory-alerts-banner.component.ts`: Quản lý trạng thái mở rộng/thu gọn `isExpanded`, gỡ bỏ `isDismissed`
  - `inventory-alerts-banner.component.html`: Băng rôn cảnh báo khẩn cấp đầu trang dạng Accordion, hiển thị top alert nguy cấp nhất và danh sách chi tiết các cảnh báo khi mở rộng
  - `inventory-alerts-banner.component.scss`: Animation trượt mượt mà, tone màu cam đỏ cảnh báo
  - Hỗ trợ click vào từng cảnh báo để chuyển tab và cuộn đến đúng mặt hàng / lô hàng liên quan

**Trạm kiểm tra (Checkpoint)**: 4 Thẻ Bento KPI hiển thị chính xác số liệu; click thẻ "Cảnh báo thiếu hụt" tự động kích hoạt lọc; băng rôn cảnh báo mở rộng/thu gọn mượt mà.

---

## Phase 3: Tab Danh mục Nguyên liệu & Thanh Tiến trình Tồn An toàn (`InventoryIngredientTabComponent`)

**Mục tiêu**: Tái thiết kế Tab Nguyên liệu sang chuẩn Bento Table, bổ sung thanh tiến trình trực quan phản ánh mức độ an toàn tồn kho.

- [x] T007 [US2] Xây dựng `InventoryIngredientTabComponent` trong `angular/src/app/inventory/components/inventory-ingredient-tab/`:
  - `inventory-ingredient-tab.component.ts`: Cấu hình Standalone, `OnPush`, nhận `@Input() ingredients`, `@Input() searchQuery`, `@Input() storageFilter`, `@Input() stockFilter`
  - Lọc tìm kiếm theo tên/mã với debounce 250ms, lọc theo 4 nhóm bảo quản (Tất cả, Mát, Đông, Khô), lọc trạng thái tồn (Tất cả, An toàn, Thiếu hụt)
  - `inventory-ingredient-tab.component.html`: Bảng dữ liệu hiện đại Bento:
    + Cột Tên nguyên liệu & Mã
    + Cột Đơn vị chuẩn kho
    + Cột Điều kiện bảo quản kèm icon nhiệt độ
    + Cột Tồn kho khả dụng & Định mức tồn an toàn
    + Cột Thanh tiến trình tồn kho trực quan (Visual Stock Progress Bar) với dải màu: Xanh (>= 100%), Cam (50-99%), Đỏ (< 50%)
    + Cột Giá vốn ước tính
    + Cột Thao tác nhanh: Nút `[Lô hàng]`, Nút `[+ Nhập kho]`, Nút `[Sửa]`
  - `inventory-ingredient-tab.component.scss`: Styling bảng Bento bo góc, hover row mềm mại
- [x] T008 [US2] Tích hợp các sự kiện mở modal từ Tab Nguyên liệu:
  - Bấm nút `[+ Thêm nguyên liệu]` trên toolbar $\rightarrow$ phát sự kiện mở `IngredientModalComponent`
  - Bấm nút `[Lô hàng]` trên từng dòng $\rightarrow$ mở `IngredientBatchesModalComponent` xem các lô của nguyên liệu
  - Bấm nút `[+ Nhập kho]` trên từng dòng $\rightarrow$ mở `CreateInventoryBatchModalComponent` với nguyên liệu được chọn sẵn
  - Bấm nút `[Sửa]` $\rightarrow$ mở modal chỉnh sửa thông tin nguyên liệu

**Trạm kiểm tra (Checkpoint)**: Tab Nguyên liệu hiển thị bảng Bento sắc nét; thanh tiến trình hiển thị đúng màu theo tỷ lệ tồn; bộ lọc nhiệt độ và tìm kiếm phản hồi tức thì (< 150ms).

---

## Phase 4: Tab Quản lý Lô hàng Nâng cao & Trực quan hóa Hạn dùng FEFO (`InventoryBatchTabComponent`)

**Mục tiêu**: Xây dựng Tab Lô hàng chuyên sâu, hiển thị timeline hạn dùng FEFO thời gian thực và tích hợp các thao tác 1 chạm (Khóa, Mở khóa, Xuất hủy).

- [x] T009 [US3] Xây dựng `InventoryBatchTabComponent` trong `angular/src/app/inventory/components/inventory-batch-tab/`:
  - `inventory-batch-tab.component.ts`: Tính toán hạn sử dụng FEFO (`daysRemaining = expirationDate - today`), phân loại 4 trạng thái (`Safe`, `ExpiringSoon`, `Expired`, `Locked` theo RM-013)
  - `inventory-batch-tab.component.html`: Bảng danh mục lô hàng Bento:
    + Cột Mã lô & Tên nguyên liệu
    + Cột Ngày nhập & Hạn sử dụng kèm Badge trạng thái FEFO thời gian thực (Xanh an toàn, Cam cận date, Đỏ quá hạn, Tím/Xám khóa)
    + Cột Thanh mini timeline tiến trình vòng đời lô hàng
    + Cột Số lượng tồn hiện tại / Số lượng ban đầu
    + Cột Đơn giá nhập và thành tiền tồn kho
    + Cột Thao tác 1 chạm trên từng dòng: `[Khóa lô]`, `[Mở khóa]`, `[Xuất hủy]`
  - `inventory-batch-tab.component.scss`: Styling badge hạn dùng và thanh mini progress bar
- [x] T010 [US3] Tích hợp các thao tác 1 chạm trên dòng lô hàng:
  - Nhấn `[Khóa lô]` $\rightarrow$ mở modal nhập lý do mẫu $\rightarrow$ gọi `inventoryService.deactivateBatch` $\rightarrow$ cập nhật trạng thái lô thành Inactive (RM-013)
  - Nhấn `[Mở khóa]` $\rightarrow$ mở dialog xác nhận $\rightarrow$ gọi `inventoryService.reactivateBatch` $\rightarrow$ khôi phục lô khả dụng cho FEFO
  - Nhấn `[Xuất hủy]` $\rightarrow$ mở `DiscardBatchModalComponent` $\rightarrow$ gọi `inventoryService.discardBatch` $\rightarrow$ trừ kho và ghi nhận giao dịch `DISCARD`
  - Tự động làm mới số liệu thẻ KPI sau mỗi thao tác thành công

**Trạm kiểm tra (Checkpoint)**: Danh sách lô hiển thị đầy đủ badge FEFO và timeline ngày; thao tác Khóa/Mở khóa cập nhật trạng thái lô ngay lập tức; thao tác Xuất hủy ghi nhận thành công.

---

## Phase 5: Tab Nhật ký Giao dịch & Tiện ích Dự báo Mua hàng (RM-014)

**Mục tiêu**: Xây dựng Tab Nhật ký Giao dịch minh bạch và tích hợp tiện ích đề xuất nhập hàng từ module Dự báo RM-014.

- [x] T011 [US4] Xây dựng `InventoryTransactionTabComponent` trong `angular/src/app/inventory/components/inventory-transaction-tab/`:
  - `inventory-transaction-tab.component.ts`: Quản lý danh sách giao dịch biến động, lọc theo loại giao dịch (`IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DISCARD`) và lọc khoảng thời gian
  - `inventory-transaction-tab.component.html`: Bảng lịch sử giao dịch bất biến với badge màu sắc và icon phân biệt rõ ràng từng loại giao dịch, nút `[Điều chỉnh kiểm kê]` mở `StockAdjustmentModalComponent`
  - `inventory-transaction-tab.component.scss`: Styling bảng Bento
- [x] T012 [US6] Xây dựng `ReplenishmentInsightsWidgetComponent` trong `angular/src/app/inventory/components/replenishment-insights-widget/`:
  - `replenishment-insights-widget.component.ts`: Tải dữ liệu từ Kế hoạch nguyên liệu RM-014 hoặc tính toán độ lệch giữa tồn khả dụng và định mức an toàn
  - `replenishment-insights-widget.component.html`: Thẻ tiện ích Bento thông minh hiển thị Top 3-5 nguyên liệu thiếu hụt dự báo, số lượng đề xuất mua và nút bấm 1-click `[+ Nhập hàng]`
  - `replenishment-insights-widget.component.scss`: Visual Bento Card Cam & Trắng nổi bật
  - Tương tác 1-click: Nhấn nút mở `CreateInventoryBatchModalComponent` với nguyên liệu và số lượng gợi ý được điền sẵn tự động

**Trạm kiểm tra (Checkpoint)**: Tab Giao dịch hiển thị đầy đủ lịch sử với badge màu; tiện ích Đề xuất Nhập hàng hiển thị đúng top nguyên liệu thiếu; bấm nút 1-click mở modal tạo lô với dữ liệu điền sẵn.

---

## Phase 6: Chuẩn hóa Toàn diện 4 Modal Nghiệp vụ theo Chuẩn Bento Design System

**Mục tiêu**: Nâng cấp toàn diện 4 modal nghiệp vụ kho sang chuẩn Bento (Cam & Trắng `#EA580C`, bo góc `rounded-2xl`, validate realtime), đảm bảo dùng chung cho cả `/inventory` và `/inventory-keeper`.

- [x] T013 [US5] Tái thiết kế `CreateInventoryBatchModalComponent` tại `angular/src/app/inventory/create-batch-modal/`:
  - Giao diện Bento: Header cam nhận diện, viền xám nhạt, bo góc `rounded-2xl`
  - Tích hợp `CustomSelect` tìm kiếm nhanh nguyên liệu, tự động hiển thị đơn vị chuẩn kho
  - Tự động gợi ý ngày nhập là hôm nay, tự động tính thành tiền dự toán (`Số lượng × Đơn giá`)
  - Bắt sự kiện phím `Enter` submit form, phím `Esc` đóng an toàn
- [x] T014 [US5] Tái thiết kế `DiscardBatchModalComponent` tại `angular/src/app/inventory/discard-batch-modal/`:
  - Hộp thoại xuất hủy chuẩn Bento: Chọn lý do mẫu (Hết hạn, Hư hỏng, Mất phẩm chất, Khác), hiển thị số lượng hủy và cảnh báo trừ kho
- [x] T015 [US5] Tái thiết kế `StockAdjustmentModalComponent` tại `angular/src/app/inventory/stock-adjustment-modal/`:
  - Hộp thoại kiểm kê cân đối kho: Tự động tính Delta chênh lệch (thừa/thiếu), chặn nhập số âm, bắt buộc nhập lý do kiểm kê
- [x] T016 [US5] Chuẩn hóa `IngredientBatchesModalComponent` tại `angular/src/app/inventory/ingredient-batches-modal/`:
  - Bảng tra cứu danh sách lô của một nguyên liệu với phong cách Bento bo góc `rounded-2xl`, hiển thị badge FEFO và thanh thao tác nhanh

**Trạm kiểm tra (Checkpoint)**: Cả 4 modal hiển thị giao diện Bento đồng bộ, bắt phím `Esc`/`Enter` mượt mà, validate chặt chẽ, hoạt động trơn tru ở cả `/inventory` lẫn `/inventory-keeper`.

---

## Phase 7: Quốc tế hóa (i18n), Kiểm thử Tự động & Xác thực Toàn diện

**Mục tiêu**: Hoàn thiện 100% bản dịch song ngữ Tiếng Việt & Tiếng Anh, viết Unit Tests và thực thi toàn bộ 6 kịch bản kiểm thử trong `quickstart.md`.

- [x] T017 [US1-US6] Cập nhật từ điển đa ngôn ngữ trong `angular/src/assets/i18n/vi.json` và `en.json`:
  - Đồng bộ toàn bộ các khóa bản dịch từ bảng tra cứu trong `data-model.md`
  - Đảm bảo 100% tiêu đề, nhãn nút, thẻ KPI, thông báo lỗi và badge FEFO có bản dịch chuẩn xác
- [x] T018 [P] Viết Unit Tests tự động:
  - `inventory-kpi-bar.component.spec.ts`: Kiểm thử render 4 thẻ KPI và phát sự kiện click
  - `inventory-batch-tab.component.spec.ts`: Kiểm thử logic tính ngày còn lại FEFO và phân loại 4 trạng thái
  - `inventory-state.service.spec.ts`: Kiểm thử quản lý Signals và đồng bộ trạng thái
- [x] T019 [US1-US6] Thực thi toàn bộ 6 kịch bản kiểm thử trong `quickstart.md`:
  - Kịch bản 1: Điều hướng & Đồng bộ Query Parameter `?tab=...`
  - Kịch bản 2: Khối 4 Thẻ Bento KPI & Băng rôn Cảnh báo Khẩn cấp
  - Kịch bản 3: Danh mục Nguyên liệu & Thanh Tiến trình Tồn An toàn
  - Kịch bản 4: Quản lý Lô hàng Nâng cao, FEFO Timeline & Thao tác 1 Chạm
  - Kịch bản 5: Đề xuất Nhập hàng từ Dự báo (RM-014) & 1-Click Nhập Lô
  - Kịch bản 6: Chuẩn hóa 4 Modal Bento & Lối tắt sang Phân hệ Thủ kho
  - Xác thực độ tương thích responsive trên Desktop (>= 1200px) và Tablet (768px - 1199px)

**Trạm kiểm tra (Checkpoint)**: Toàn bộ tests chạy đạt 100% PASS; giao diện Bento Cam & Trắng hiển thị mượt mà trên trình duyệt; không có bất kỳ lỗi console nào.
