# Báo cáo Phân tích Kiểm chéo (Cross-Artifact Analysis): RM-021 Làm lại giao diện kho bên Dashboard

**Tính năng**: `RM-021 — Làm lại giao diện kho bên Dashboard (Dashboard Inventory Redesign)`  
**Ngày thực hiện**: 2026-10-20  
**Trạng thái**: Đạt Phê duyệt 100% (Passed - Ready for Implementation)  
**Tài liệu đối chiếu**:
- Đặc tả Nghiệp vụ: [spec.md](spec.md)
- Kế hoạch Triển khai: [plan.md](plan.md)
- Danh sách Công việc: [tasks.md](tasks.md)
- Báo cáo Nghiên cứu Kỹ thuật: [research.md](research.md)
- Thiết kế Mô hình Dữ liệu: [data-model.md](data-model.md)
- Hợp đồng Kiến trúc & Giao tiếp: [contracts/dashboard-inventory-contracts.md](contracts/dashboard-inventory-contracts.md)
- Hướng dẫn Kiểm thử: [quickstart.md](quickstart.md)
- Checklist Kiểm soát Chất lượng: [checklists/requirements.md](checklists/requirements.md)

---

## 1. Mục tiêu Phân tích

Tiến hành kiểm chéo toàn diện tính nhất quán, tính khả thi và độ bao phủ giữa:
1. **Yêu cầu Nghiệp vụ (`spec.md`)** với **Giải pháp Kỹ thuật (`plan.md`, `research.md`)**.
2. **Kế hoạch Triển khai (`plan.md`)** với **Danh sách Công việc Cụ thể (`tasks.md`)**.
3. **Các Quyết định Vận hành Thống nhất (`/speckit.clarify`)** với **Hợp đồng Component & Thiết kế Dữ liệu**.
4. **Hiện trạng Mã nguồn thực tế** với **Các can thiệp kỹ thuật dự kiến thực thi**.

---

## 2. Ma trận Ánh xạ & Độ Phủ (Traceability Matrix)

### 2.1 Ánh xạ User Stories ↔ Yêu cầu Chức năng ↔ Tiêu chí Thành công ↔ Tasks Triển khai

| User Story | Yêu cầu Chức năng (FR) | Tiêu chí Thành công (SC) | Tasks Triển khai (`tasks.md`) | Đánh giá Khớp nối |
|---|---|---|---|---|
| **US1**: Khối Thẻ Chỉ số KPI Bento Grid & Băng rôn Cảnh báo Thông minh (P1) | FR-001, FR-002, FR-003, FR-013 | SC-001, SC-003, SC-007 | `T001`, `T002`, `T004`, `T005`, `T006`, `T017`, `T018`, `T019` | **Khớp 100%**: Xây dựng 4 thẻ KPI Bento Card (Tổng nguyên liệu, Tồn an toàn, Cảnh báo thiếu hụt, Lô quá hạn cần hủy) hỗ trợ click lọc nhanh; Băng rôn cảnh báo khẩn cấp đầu trang dạng Accordion có liên kết sâu. |
| **US2**: Danh mục Nguyên liệu & Định mức An toàn (Ingredients Tab) (P1) | FR-001, FR-004, FR-005, FR-011, FR-012 | SC-001, SC-002, SC-004, SC-007 | `T001`, `T002`, `T003`, `T007`, `T008`, `T017`, `T019` | **Khớp 100%**: Bảng Bento Table hiển thị tồn khả dụng, định mức tồn an toàn, thanh tiến trình màu sắc trực quan (Xanh $\ge$ 100%, Cam 50-99%, Đỏ < 50%), lọc nhiệt độ bảo quản và debounce tìm kiếm 250ms. |
| **US3**: Quản lý Lô hàng Nâng cao & Trực quan hóa Hạn dùng FEFO (Batches Tab) (P1) | FR-001, FR-004, FR-006, FR-011, FR-012 | SC-001, SC-002, SC-004, SC-007 | `T001`, `T002`, `T003`, `T009`, `T010`, `T017`, `T018`, `T019` | **Khớp 100%**: Bảng danh mục lô hàng với Badge hạn dùng FEFO 4 trạng thái màu (Xanh an toàn, Cam cận date, Đỏ quá hạn, Tím/Xám khóa RM-013), mini timeline hạn dùng và thanh tác vụ 1 chạm (Khóa, Mở khóa, Xuất hủy). |
| **US4**: Nhật ký Giao dịch Xuất Nhập Tồn & Kiểm kê Cân đối (Transactions Tab) (P1) | FR-001, FR-004, FR-007, FR-008 | SC-001, SC-002, SC-005, SC-007 | `T001`, `T002`, `T003`, `T011`, `T015`, `T017`, `T019` | **Khớp 100%**: Bảng lịch sử biến động bất biến với Badge màu phân loại từng loại giao dịch (`IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DISCARD`), nút kích hoạt modal kiểm kê cân đối kho. |
| **US5**: Tối ưu hóa Toàn diện các Modal Nghiệp vụ Kho (Modals Redesign) (P1) | FR-008, NFR-002, NFR-005 | SC-001, SC-005, SC-007 | `T013`, `T014`, `T015`, `T016`, `T017`, `T019` | **Khớp 100%**: Tái thiết kế toàn diện 4 Modal (`CreateBatchModal`, `DiscardBatchModal`, `StockAdjustmentModal`, `IngredientBatchesModal`) theo chuẩn Bento `#EA580C`, bo góc `rounded-2xl`, validate realtime, dùng chung cho cả `/inventory` và `/inventory-keeper`. |
| **US6**: Tích hợp Thông tin Dự báo (RM-014) & Lối tắt Phân hệ Thủ kho (RM-020) (P2) | FR-009, FR-010 | SC-001, SC-006, SC-007 | `T001`, `T002`, `T004`, `T012`, `T017`, `T019` | **Khớp 100%**: Tiện ích Bento `ReplenishmentInsightsWidget` hiển thị Top nguyên liệu dự báo thiếu trong 7 ngày tới kèm nút 1-click mở modal nhập lô điền sẵn; nút `[Giao diện Thủ kho ↗]` chuyển sang `/inventory-keeper`. |
| **Phi chức năng, Phân quyền & i18n** | FR-013, FR-014, FR-015, NFR-001..006 | SC-001, SC-002, SC-007 | `T002`, `T003`, `T017`, `T018`, `T019` | **Khớp 100%**: Bảo vệ phân quyền `smartPermissionGuard`, tích hợp phục hồi điều hướng RM-019, 100% song ngữ `vi.json` và `en.json`, thực thi toàn bộ 6 kịch bản kiểm thử theo `quickstart.md`. |

### 2.2 Độ phủ Yêu cầu (Coverage Ratio)
- **Yêu cầu Chức năng**: **15/15 FR (100%)**
- **Yêu cầu Phi chức năng**: **6/6 NFR (100%)**
- **Tiêu chí Thành công**: **7/7 SC (100%)**
- **Nhiệm vụ Triển khai**: **19/19 Tasks (100%)**  
$\rightarrow$ **Kết luận**: Không có bất kỳ khoảng trống yêu cầu nào (Zero Gaps) và không có tác vụ triển khai mồ côi (Zero Orphaned Tasks).

---

## 3. Kiểm tra Tính Nhất quán với 4 Quyết định Kiến trúc & Vận hành (`/speckit.clarify`)

1. **Quyết định 1: Cấu trúc Tab & Đồng bộ Query Parameter (`?tab=ingredients|batches|transactions`)**:
   - `spec.md`: Làm rõ A1, FR-001, FR-004.
   - `research.md`: Mục 1 Phân rã mô-đun và đồng bộ qua `ActivatedRoute.queryParamMap`.
   - `data-model.md`: Type `InventoryTabType = 'ingredients' | 'batches' | 'transactions'`.
   - `contracts`: Router Contract quy ước query param mặc định là `ingredients`.
   - `tasks.md`: `T002` (State Signal), `T003` (Lắng nghe queryParamMap), `T004` (Tab header HTML).
   - *Đánh giá*: **Khớp 100%**. Đồng bộ hoàn hảo giữa URL trình duyệt và trạng thái chuyển tab của component, hỗ trợ lưu lịch sử duyệt web và bookmark mượt mà.

2. **Quyết định 2: Quản lý Lô hàng (Batches View) & Trực quan hóa Hạn dùng FEFO**:
   - `spec.md`: Làm rõ A2, FR-006, US3.
   - `research.md`: Mục 2 Phân loại 4 trạng thái hạn dùng và tính tỷ lệ tiến trình vòng đời lô.
   - `data-model.md`: Enum `BatchFefoStatus` (`Safe`, `ExpiringSoon`, `Expired`, `Locked`) và interface `BatchViewItem`.
   - `contracts`: Component contract `InventoryBatchTabComponent`.
   - `tasks.md`: `T009` (Tính toán daysRemaining & Badge FEFO), `T010` (Thao tác 1 chạm Khóa/Mở khóa/Xuất hủy).
   - *Đánh giá*: **Khớp 100%**. Hiển thị trực quan đếm ngược hạn dùng, đồng bộ chuẩn xác với vòng đời khóa lô của RM-013.

3. **Quyết định 3: Tích hợp Đề xuất Mua hàng Dự báo (RM-014)**:
   - `spec.md`: Làm rõ A3, FR-010, US6.
   - `research.md`: Mục 3 Tích hợp Kế hoạch nguyên liệu RM-014 và hành động 1-click tạo lô.
   - `data-model.md`: Interface `ReplenishmentSuggestionItem`.
   - `contracts`: Component contract `ReplenishmentInsightsWidgetComponent`.
   - `tasks.md`: `T012` (Xây dựng widget và sự kiện 1-click mở modal nhập lô tự động điền sẵn).
   - *Đánh giá*: **Khớp 100%**. Kết nối thông suốt giữa bài toán dự báo nhu cầu và hành động bổ sung tồn kho thực tế.

4. **Quyết định 4: Chuẩn hóa 4 Modal Nghiệp vụ theo Bento Design System**:
   - `spec.md`: Làm rõ A4, FR-008, US5.
   - `research.md`: Mục 4 Độc lập hóa và tái sử dụng đa phân hệ.
   - `data-model.md`: Các DTOs nhập/xuất/kiểm kê.
   - `contracts`: Danh mục Modal standalone components.
   - `tasks.md`: `T013` (CreateBatch), `T014` (DiscardBatch), `T015` (StockAdjustment), `T016` (IngredientBatches).
   - *Đánh giá*: **Khớp 100%**. Giao diện Bento đồng nhất, bắt phím `Esc`/`Enter` thông minh, chia sẻ dùng chung giữa Dashboard `/inventory` và Quầy kho `/inventory-keeper`.

---

## 4. Khảo sát Hiện trạng Mã nguồn & Đánh giá Tác động (Codebase Gap Analysis)

### 4.1 Tầng Backend (`Acme.TooHungry`)
- **Đánh giá Tác động**: **Zero Backend Impact (Không can thiệp Backend)**.
- **Hiện trạng**: Toàn bộ hệ thống API cần thiết cho quản trị tồn kho đã hoàn thiện và đạt 100% unit tests từ các module trước:
  - `IInventoryAppService`: Endpoints `batches`, `createBatch`, `discardBatch`, `deactivateBatch`, `reactivateBatch`, `stock-adjustment`, `alerts`, `transactions`.
  - `IIngredientAppService`: Endpoints CRUD nguyên liệu, lấy danh sách và tính tồn an toàn.
  - `TooHungryPermissions.Inventories`: Phân quyền đầy đủ.
- **Kết luận**: Tận dụng 100% backend hiện có, không làm phát sinh bất kỳ nợ kỹ thuật backend nào.

### 4.2 Tầng Frontend (`Acme.TooHungry/angular`)
1. **Component Cha Monolithic (`inventory.component.ts` ~957 dòng & `html` ~1161 dòng)**:
   - *Hiện trạng*: File quá lớn, chứa toàn bộ HTML các tab, logic tính toán, gọi API và khai báo inline forms.
   - *Giải pháp*: Phân rã cấu trúc theo mô hình sạch:
     - Tạo thư mục con `components/` bên trong `angular/src/app/inventory/`.
     - Chuyển logic từng tab thành các sub-components độc lập:
       + `inventory-kpi-bar/`
       + `inventory-alerts-banner/`
       + `inventory-ingredient-tab/`
       + `inventory-batch-tab/`
       + `inventory-transaction-tab/`
       + `replenishment-insights-widget/`
     - Component cha `InventoryComponent` chỉ giữ vai trò Shell điều phối, quản lý Signals và lắng nghe Query Params (< 250 dòng).
2. **Các Modal Nghiệp vụ Kho**:
   - *Hiện trạng*: Đã có các modal trong `angular/src/app/inventory/` (`discard-batch-modal`, `stock-adjustment-modal`, `ingredient-batches-modal`, `ingredient-modal`). Tuy nhiên giao diện còn mang phong cách Bootstrap cũ và chưa có modal nhập lô mới chuẩn Bento độc lập.
   - *Giải pháp*: Chuẩn hóa lại visual theo Bento Design System (`rounded-2xl`, viền `#EA580C`, input focus cam) và xây dựng modal nhập lô mới tái sử dụng.
3. **Đa ngôn ngữ (i18n)**:
   - *Hiện trạng*: Các từ khóa cơ bản đã có trong `vi.json` và `en.json`.
   - *Giải pháp*: Bổ sung khoảng 15 khóa bản dịch mới theo bảng kê trong `data-model.md` để đảm bảo 100% song ngữ.

---

## 5. Đánh giá Rủi ro & Chiến lược Giảm thiểu (Risk Assessment & Mitigation)

| Rủi ro Kỹ thuật | Mức độ | Khả năng | Biện pháp Giảm thiểu Đã Thiết kế |
|---|---|---|---|
| **R1: Xung đột trạng thái Tab khi reload hoặc bấm nút Back trình duyệt** | Vừa | Thấp | Sử dụng `ActivatedRoute.queryParamMap` kết hợp `router.navigate` với `queryParamsHandling: 'merge'`, đảm bảo URL luôn là nguồn chân lý duy nhất (Single Source of Truth) cho trạng thái Tab. |
| **R2: Suy giảm hiệu năng khi render danh sách lô hàng lớn** | Vừa | Thấp | Áp dụng `ChangeDetectionStrategy.OnPush` trên toàn bộ sub-components; tính toán trạng thái FEFO một lần duy nhất khi nạp dữ liệu thay vì tính trong template. |
| **R3: Bất đồng bộ dữ liệu giữa Quản lý trên Dashboard và Thủ kho tại Quầy** | Thấp | Vừa | Cung cấp nút làm mới dữ liệu nhanh trên Header; tự động gọi lại API tải lô sau mỗi thao tác xuất nhập hoặc khóa/mở khóa. |
| **R4: Xung đột phong cách CSS giữa Shared UI mới và Bootstrap cũ** | Thấp | Thấp | Đóng gói kiểu dáng trong SCSS component scoped; sử dụng trực tiếp các biến CSS token nhận diện Cam & Trắng (`#EA580C`). |

---

## 6. Kết luận Kiểm định (Final Verdict)

Báo cáo phân tích xác nhận tính năng **RM-021 (Làm lại giao diện kho bên Dashboard)** đạt chuẩn tuyệt đối:
- [x] **100% Yêu cầu Nghiệp vụ** có giải pháp kỹ thuật cụ thể tương ứng.
- [x] **100% Tasks Triển khai** được liên kết chặt chẽ với User Stories và Tiêu chí Thành công.
- [x] **100% Phù hợp Hiến pháp Dự án** (DDD, Angular 19 Standalone, Bento Visual Cam & Trắng `#EA580C`, i18n song ngữ).
- [x] **Sẵn sàng 100% cho bước Thực thi Mã nguồn (`/speckit.implement RM-021`)**.
