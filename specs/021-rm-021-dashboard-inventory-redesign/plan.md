# Kế hoạch Triển khai (Implementation Plan): RM-021 Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)

**Nhánh (Branch)**: `021-rm-021-dashboard-inventory-redesign` | **Ngày**: 2026-10-20 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/021-rm-021-dashboard-inventory-redesign/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 20-10-2026 với 4 quyết định kiến trúc then chốt:
1. **Cấu trúc Tab & Đồng bộ Query Param**: Giữ route chính `/inventory?tab=ingredients|batches|transactions`, phân rã thành các sub-components độc lập (`InventoryKpiBar`, `InventoryAlertsBanner`, `InventoryIngredientTab`, `InventoryBatchTab`, `InventoryTransactionTab`) hỗ trợ bookmark và chia sẻ liên kết trực tiếp.
2. **Theo dõi Lô hàng (Batches View) & FEFO Timeline**: Bảng Bento Card hiện đại với thanh đếm ngược hạn dùng FEFO trực quan, phân màu cảnh báo (Xanh/Cam/Đỏ/Tím) và thanh tác vụ nhanh 1 chạm trên từng dòng (Khóa lô RM-013, Mở khóa, Xuất hủy).
3. **Tích hợp Dự báo nhu cầu (RM-014)**: Thẻ tiện ích Bento thông minh (`Replenishment Insights Widget`) hiển thị Top nguyên liệu dự báo thiếu trong 7 ngày tới kèm nút 1-click mở modal nhập lô điền sẵn số lượng.
4. **Chuẩn hóa Modal theo Bento Design System**: Tái thiết kế toàn diện 4 Modal (`CreateBatchModal`, `DiscardBatchModal`, `StockAdjustmentModal`, `IngredientBatchesModal`) theo chuẩn Cam & Trắng `#EA580C`, bo góc `rounded-2xl`, validate realtime, chia sẻ dùng chung cho cả `/inventory` và `/inventory-keeper`.

---

## Tóm tắt (Summary)

Tái thiết kế toàn diện màn hình **Quản lý Tồn kho bên Dashboard (`/inventory`) (RM-021)**, nâng cấp từ một component nguyên khối (monolithic) cồng kềnh hơn 1000 dòng code trở thành **Trung tâm Quản trị Tồn kho & Tài chính Kho Hiện đại**, theo chuẩn Bento Grid Cam & Trắng (`#EA580C`), bo góc mềm mại `rounded-2xl`, đồng bộ nhận diện với Dashboard ([RM-018](file:///d:/DFT/Acme.TooHungry/specs/018-rm-018-dashboard-redesign/spec.md)) và Bàn ăn ([RM-017](file:///d:/DFT/Acme.TooHungry/specs/017-rm-017-table-management-redesign/spec.md)).

### Các mục tiêu kiến trúc cốt lõi:
1. **Phân rã Mô-đun & Đồng bộ Trạng thái Tab qua Query Parameter**:
   - Tách biệt `InventoryComponent` cha thành 5 sub-components chuyên biệt với `ChangeDetectionStrategy.OnPush`.
   - Đồng bộ trạng thái duyệt web qua URL `/inventory?tab=ingredients|batches|transactions`.
2. **Khối 4 Thẻ Bento KPI Chỉ số Kho & Băng rôn Cảnh báo Khẩn cấp**:
   - `InventoryKpiBarComponent`: Tổng số nguyên liệu, Tồn an toàn, Cảnh báo thiếu hụt, Lô quá hạn cần hủy.
   - `InventoryAlertsBannerComponent`: Băng rôn cảnh báo hạn dùng và hết hàng ghim đầu trang dạng Accordion mượt mà.
3. **Bảng Danh mục Lô hàng (Batches View) & Trực quan hóa FEFO**:
   - Hiển thị timeline đếm ngược hạn dùng thời gian thực với 4 trạng thái màu (Xanh, Cam, Đỏ, Tím khóa RM-013).
   - Thanh tác vụ 1 chạm: Khóa lô an toàn, Kích hoạt lại, Xuất hủy lô quá hạn lập tức.
4. **Tích hợp Tiện ích Đề xuất Nhập hàng từ Dự báo (RM-014)**:
   - `ReplenishmentInsightsWidgetComponent`: Phân tích chênh lệch giữa tồn kho khả dụng và kế hoạch mua hàng, cho phép 1-click mở modal tạo lô với số lượng tự động điền sẵn.
5. **Chuẩn hóa Toàn diện 4 Modal Nghiệp vụ Kho theo Chuẩn Bento**:
   - `CreateInventoryBatchModalComponent`, `DiscardBatchModalComponent`, `StockAdjustmentModalComponent`, `IngredientBatchesModalComponent`.
   - Thiết kế Standalone, có thể dùng chung mượt mà cho cả Dashboard `/inventory` lẫn Quầy kho `/inventory-keeper`.
6. **Lối tắt Chuyển đổi Nhanh sang Phân hệ Thủ kho (`/inventory-keeper`)**:
   - Nút hành động `[Giao diện Thủ kho ↗]` trên thanh tiêu đề cho phép Quản lý di chuyển tức thì sang không gian tác nghiệp quầy kho.
7. **100% Quốc tế hóa Song ngữ Toàn diện (i18n)**:
   - Cung cấp đầy đủ từ điển song ngữ trong `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: TypeScript 5.x, Angular 19+, ABP Framework 9.x
- **Kiến trúc Frontend**: Angular Standalone Components, Signal Reactive State (`signal`, `computed`, `toSignal`), RxJS Observables, Angular Router Query Params
- **Thư viện tích hợp**: `@abp/ng.core`, `@abp/ng.theme.shared`, FontAwesome Free icons
- **Nền tảng đích**: Web application responsive (Desktop chuẩn >= 1200px, Tablet landscape/portrait 768px - 1199px)
- **Ràng buộc Hiệu năng**:
  - Thời gian tải trang ban đầu < 200ms
  - Thời gian chuyển đổi giữa các tab < 100ms
  - Thời gian phản hồi tìm kiếm debounce < 250ms
- **Ràng buộc Thương hiệu & I18N**:
  - Nhận diện Cam & Trắng (`#EA580C`, nền `#F8FAFC`, bề mặt thẻ `#FFFFFF`, viền `#E2E8F0`, điểm nhấn `#FFF7ED`)
  - 100% chuỗi hiển thị nạp qua `abpLocalization` pipe hoặc `LocalizationService`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Tái sử dụng 100% Domain Models và Application Services hiện có (`IInventoryAppService`, `IIngredientAppService`). Không làm biến đổi cấu trúc nghiệp vụ hay sinh nợ kỹ thuật backend.
- [x] **II. UML & Domain Model Alignment**:
  - Khớp hoàn toàn với sơ đồ lớp và kiến trúc phân quyền trong `RMS-TH.vpp` và `docs/roadmap.md`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Đảm bảo kiểm thử tự động cho các sub-components mới, kiểm thử logic tính hạn dùng FEFO và đồng bộ query param.
- [x] **IV. Hợp đồng Giao tiếp**:
  - Tuân thủ hợp đồng kỹ thuật chi tiết tại `contracts/dashboard-inventory-contracts.md`.
- [x] **V. Bảo mật & Phân quyền**:
  - Bảo vệ trang bằng `smartPermissionGuard` với chính sách quyền `TooHungry.Inventories`.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Chuẩn Bento Grid, bo góc `rounded-2xl`, màu cam chủ đạo `#EA580C`.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% chuỗi hiển thị có trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ tài liệu được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/)
```text
specs/021-rm-021-dashboard-inventory-redesign/
├── spec.md                                 # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                                 # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                             # Nghiên cứu kỹ thuật Sub-components, FEFO Timeline, Forecast Integration
├── data-model.md                           # Thiết kế State Signals, Enum, Interfaces và từ điển i18n
├── quickstart.md                           # Hướng dẫn kiểm thử 6 kịch bản vận hành quản trị kho
├── contracts/
│   └── dashboard-inventory-contracts.md   # Hợp đồng Sub-Components, Router definitions, API endpoints
└── checklists/
    └── requirements.md                     # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Triển khai & Tái cấu trúc (angular/src/app/inventory/)
```text
angular/src/app/inventory/
├── inventory.component.ts                  # Component Shell điều phối, quản lý query param & signals (< 250 dòng)
├── inventory.component.html                # Template Shell gọn gàng chứa Header, KpiBar, Alerts, Tabs
├── inventory.component.scss                # Styles chuẩn Bento Grid và các biến màu
├── components/
│   ├── inventory-kpi-bar/                 # 4 Thẻ Bento KPI tổng quan sức khỏe kho
│   ├── inventory-alerts-banner/           # Băng rôn cảnh báo khẩn cấp dạng Accordion
│   ├── inventory-ingredient-tab/          # Tab 1: Danh mục nguyên liệu & thanh tiến trình tồn
│   ├── inventory-batch-tab/               # Tab 2: Danh sách lô hàng, timeline FEFO & thao tác 1 chạm
│   ├── inventory-transaction-tab/         # Tab 3: Nhật ký xuất nhập tồn & kiểm kê điều chỉnh
│   └── replenishment-insights-widget/     # Tiện ích gợi ý nhập hàng liên kết từ Dự báo RM-014
├── create-batch-modal/                     # Modal nhập lô hàng mới (Bento style)
├── discard-batch-modal/                    # Modal xuất hủy lô quá hạn / hỏng (Bento style)
├── stock-adjustment-modal/                 # Modal kiểm kê cân đối kho (Bento style)
└── ingredient-batches-modal/               # Modal xem chi tiết các lô của 1 nguyên liệu
```

---

## Các Giai đoạn Triển khai Chi tiết (Phases of Implementation)

### Giai đoạn 1: Khung Sườn Sub-components & Đồng bộ Query Param
- Xây dựng cấu trúc thư mục `components/` trong `angular/src/app/inventory/`.
- Cấu hình đồng bộ Query Parameter `?tab=ingredients|batches|transactions` trong `InventoryComponent`.
- Xây dựng service trạng thái nội bộ `InventoryStateService` quản lý Signals.

### Giai đoạn 2: Triển khai Khối KPI Bento & Băng rôn Cảnh báo
- Phát triển `InventoryKpiBarComponent` với 4 thẻ Bento Card chuẩn visual Cam & Trắng.
- Phát triển `InventoryAlertsBannerComponent` hỗ trợ thu gọn/mở rộng và click điều hướng đến đúng mục cảnh báo.

### Giai đoạn 3: Tái cấu trúc Tab Nguyên liệu & Tab Lô hàng (FEFO Timeline)
- Phát triển `InventoryIngredientTabComponent`: Danh mục nguyên liệu, định mức an toàn, thanh tiến trình màu sắc.
- Phát triển `InventoryBatchTabComponent`: Danh sách lô hàng, tính toán ngày hết hạn FEFO, thanh tiến trình vòng đời lô, tích hợp nút Khóa lô (RM-013), Mở khóa và Xuất hủy.

### Giai đoạn 4: Tái cấu trúc Tab Giao dịch & Tiện ích Dự báo Mua hàng (RM-014)
- Phát triển `InventoryTransactionTabComponent`: Bảng lịch sử biến động bất biến, bộ lọc loại giao dịch (`IN`, `OUT`, `ADJUSTMENT`, `DISCARD`).
- Phát triển `ReplenishmentInsightsWidgetComponent`: Đề xuất mua hàng từ Kế hoạch nguyên liệu RM-014 kèm nút 1-click mở modal nhập lô.

### Giai đoạn 5: Chuẩn hóa Toàn diện 4 Modal Nghiệp vụ Kho
- Nâng cấp `CreateInventoryBatchModalComponent` sang phong cách Bento.
- Nâng cấp `DiscardBatchModalComponent` và `StockAdjustmentModalComponent`.
- Đảm bảo các modal hoạt động trơn tru cả ở `/inventory` lẫn `/inventory-keeper`.

### Giai đoạn 6: Quốc tế hóa (i18n), Kiểm thử Tự động & Hoàn thiện
- Bổ sung 100% chuỗi đa ngôn ngữ mới vào `angular/src/assets/i18n/vi.json` và `en.json`.
- Viết unit tests kiểm thử các sub-components và logic tính toán FEFO.
- Kiểm tra toàn diện trên Desktop POS và Tablet.
