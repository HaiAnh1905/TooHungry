# Báo cáo Phân tích Kiểm chéo (Cross-Artifact Analysis): RM-017 Làm lại trang Quản lý bàn

**Tính năng**: `RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign)`  
**Ngày thực hiện**: 2026-10-16  
**Trạng thái**: Đạt Phê duyệt 100% (Passed - Ready for Implementation)  
**Tài liệu đối chiếu**:
- Đặc tả Nghiệp vụ: [spec.md](spec.md)
- Kế hoạch Triển khai: [plan.md](plan.md)
- Danh sách Công việc: [tasks.md](tasks.md)
- Báo cáo Nghiên cứu Kỹ thuật: [research.md](research.md)
- Thiết kế Mô hình Dữ liệu: [data-model.md](data-model.md)
- Hợp đồng Kiến trúc & API: [table-management-contracts.md](contracts/table-management-contracts.md)
- Hướng dẫn Kiểm thử: [quickstart.md](quickstart.md)

---

## 1. Mục tiêu Phân tích

Tiến hành kiểm chéo toàn diện tính nhất quán, tính khả thi và độ bao phủ giữa:
1. **Yêu cầu Nghiệp vụ (`spec.md`)** với **Giải pháp Kỹ thuật (`plan.md`, `research.md`)**.
2. **Kế hoạch Triển khai (`plan.md`)** với **Danh sách Công việc Cụ thể (`tasks.md`)**.
3. **Các Quyết định Vận hành Thống nhất (`/speckit.clarify`)** với **Hợp đồng API & Thiết kế Giao diện**.
4. **Hiện trạng Mã nguồn thực tế** với **Các can thiệp kỹ thuật dự kiến thực thi**.

---

## 2. Ma trận Ánh xạ & Độ Phủ (Traceability Matrix)

### 2.1 Ánh xạ User Stories ↔ Yêu cầu Chức năng ↔ Tiêu chí Thành công ↔ Tasks Triển khai

| User Story | Yêu cầu Chức năng (FR) | Tiêu chí Thành công (SC) | Tasks Triển khai (`tasks.md`) | Đánh giá Khớp nối |
|---|---|---|---|---|
| **US1**: Thẻ Bàn Hiện Đại & Đồng Bộ Thời Gian Dùng Bữa Real-Time (P1) | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006 | SC-001, SC-002 | `T009`, `T010`, `T011`, `T014`, `T015` | **Khớp 100%**: Timer 30s với reactive Signal `currentTime`, 2 tầng cảnh báo: Mức 1 ($\ge$ 60p, vàng `badge-meal-warning`) và Mức 2 ($\ge$ 90p, đỏ cam `badge-meal-long` nhấp nháy), đồng bộ `OccupiedTime` từ Backend. |
| **US2**: Hộp thoại Kết Thúc Bữa Ăn & Timeline Tiến Trình Trực Quan (P1) | FR-007, FR-008, FR-009, FR-017 | SC-004 | `T008`, `T010`, `T013` | **Khớp 100%**: Bóc tách `TableEndMealModalComponent` độc lập, Card Timeline 3 mốc (`Seated At → Elapsed → Ended At`), phân nhánh trả bàn trống (`AVAILABLE`) hoặc chuyển sang thanh toán RM-016. |
| **US3**: Chuyển Bàn & Đổi Vị Trí Ngồi Linh Hoạt (P1) | FR-010, FR-011b, FR-017 | SC-003 | `T001`, `T002`, `T003`, `T004`, `T006`, `T010`, `T013` | **Khớp 100%**: `TransferTableAsync` chuyển Order và `OccupiedTime` sang bàn đích, phân nhánh bàn nguồn (`CLEANING` nếu có order/dùng món; `AVAILABLE` nếu chưa dùng món), `TableTransferModalComponent` lọc bàn trống. |
| **US4**: Gộp Bàn Phục Vụ Đoàn Khách Lớn (P2) | FR-011, FR-011b, FR-017 | SC-003 | `T001`, `T002`, `T003`, `T005`, `T007`, `T010`, `T013` | **Khớp 100%**: `MergeTablesAsync` ghép `OrderItem` sang bàn chính, tính lại tổng tiền, đóng order phụ, xuất 1 hóa đơn duy nhất tại RM-016, `TableMergeModalComponent` chọn bàn phụ cần gộp. |
| **US5**: Nâng Cấp Giao Diện Quản Trị Sơ Đồ Bàn Admin (`/tables`) (P1) | FR-001, FR-012, FR-013, FR-014, FR-015, FR-017, FR-019 | SC-005, SC-008 | `T012`, `T013`, `T014`, `T015` | **Khớp 100%**: Phá vỡ file nguyên khối khổng lồ (HTML giảm từ 2263 xuống < 500 dòng, TS giảm từ 1914 xuống < 600 dòng), 6 thẻ chỉ số mặt bằng, chuyển đổi mượt mà Floor Plan Grid / Datatable List View. |
| **US6**: Đồng Bộ Trạng Thái Thời Gian Thực Toàn Diện SignalR (P2) | FR-016, NFR-002, NFR-006 | SC-006 | `T004`, `T005`, `T016` | **Khớp 100%**: Kênh SignalR `TableHub` phát sự kiện `tableStatusChanged` đồng bộ `OccupiedTime` và trạng thái mới tức thì dưới 1 giây giữa mọi máy khách. |
| **Quốc tế hóa & Kiểm thử Toàn diện** | FR-018, NFR-001..006 | SC-007, SC-008 | `T017`, `T018`, `T019` | **Khớp 100%**: Cập nhật 100% từ điển `vi.json` và `en.json`, xác thực biên dịch `dotnet build` và Angular build, thực hiện 5 kịch bản E2E theo quickstart.md. |

**Độ phủ Yêu cầu (Coverage Ratio)**:
- **Yêu cầu Chức năng**: **19/19 FR (100%)**
- **Yêu cầu Phi chức năng**: **6/6 NFR (100%)**
- **Tiêu chí Thành công**: **8/8 SC (100%)**
- **Nhiệm vụ Triển khai**: **19/19 Tasks (100%)**  
$\rightarrow$ **Kết quả**: Không có bất kỳ khoảng trống yêu cầu nào (Zero Gaps) và không có tác vụ triển khai mồ côi (Zero Orphaned Tasks).

---

## 3. Kiểm tra Tính Nhất quán với 5 Quyết định Kiến trúc & Vận hành (`/speckit.clarify`)

1. **Quyết định 1: Cơ chế Gộp Bàn (`Merge Tables`)**:
   - `spec.md`: Làm rõ A1, FR-011, US4 kịch bản chấp nhận.
   - `plan.md`: Mục Tóm tắt (3) & Giai đoạn 1, 2.
   - `contracts`: Endpoint `/api/app/table/merge` nhận `MergeTablesInputDto`.
   - `tasks.md`: `T001` (DTO), `T002` (Interface), `T003` (Proxy), `T005` (AppService logic), `T007` (Shared Modal), `T010`, `T013` (Tích hợp UI).
   - *Đánh giá*: **Khớp 100%**. Gộp toàn bộ món sang bàn chính, đóng order phụ, chỉ xuất 1 hóa đơn duy nhất tại RM-016.

2. **Quyết định 2: Trạng thái Bàn Nguồn sau khi Chuyển Bàn (`Transfer Table`)**:
   - `spec.md`: Làm rõ A2, FR-010, US3 kịch bản chấp nhận 2.
   - `plan.md`: Mục Tóm tắt (3) & Giai đoạn 1.
   - `contracts`: Endpoint `/api/app/table/transfer` nhận `TransferTableInputDto`.
   - `tasks.md`: `T004` (Logic phân nhánh: `Cleaning` nếu có order/dùng món; `Available` nếu chưa có order).
   - *Đánh giá*: **Khớp 100%**. Phân nhánh thông minh, không ép buộc bàn chưa dùng món phải qua khâu dọn dẹp.

3. **Quyết định 3: Hệ thống Cảnh báo Thời lượng Dùng bữa 2 Tầng**:
   - `spec.md`: Làm rõ A3, FR-006, US1 kịch bản chấp nhận 2, 3, 4.
   - `research.md`: Mục 2 Động cơ tính giờ & Phân cấp 2 tầng cảnh báo.
   - `data-model.md`: Type `MealDurationAlertTier` và các class CSS.
   - `tasks.md`: `T009` (Signal Timer 30s & logic phân tầng), `T011` (CSS warning & pulse), `T014`, `T015` (Áp dụng cho sơ đồ Admin).
   - *Đánh giá*: **Khớp 100%**. Mức 1 ($\ge$ 60p, vàng chăm sóc) và Mức 2 ($\ge$ 90p, đỏ cam ngồi lâu).

4. **Quyết định 4: Phân quyền & Vị trí Nút Chuyển bàn & Gộp bàn trên UI**:
   - `spec.md`: Làm rõ A4, FR-011b, SC-003.
   - `plan.md`: Mục Tóm tắt (3) & Giai đoạn 3, 4.
   - `tasks.md`: `T010` (Bổ sung nút trên thẻ bàn Waiter), `T013` (Bổ sung nút trên thẻ bàn Admin).
   - *Đánh giá*: **Khớp 100%**. Cả Waiter và Manager đều có quyền thao tác trực tiếp 1 chạm trên Thẻ Bàn `OCCUPIED`.

5. **Quyết định 5: Tái Cấu Trúc Mã Nguồn & Bóc Tách Sub-components**:
   - `spec.md`: Làm rõ A5, FR-017, SC-008.
   - `research.md`: Mục 1 Kiến trúc bóc tách component.
   - `plan.md`: Cấu trúc dự án `shared/components/tables/` và `table/components/`.
   - `tasks.md`: `T006`, `T007`, `T008` (Shared Modals), `T012` (Admin Form Modals), `T013`, `T014` (Rút gọn `table.component`).
   - *Đánh giá*: **Khớp 100%**. Loại bỏ hoàn toàn Order Modal trùng lặp, chia nhỏ các modal thành các component độc lập sạch sẽ.

---

## 4. Khảo sát Hiện trạng Mã nguồn & Đánh giá Tác động (Codebase Gap Analysis)

### 4.1 Tầng Backend (`Acme.TooHungry`)
1. **`TableDtos.cs` & `ITableAppService.cs`**:
   - *Hiện trạng*: Đã có `TableDto` chứa `OccupiedTime`, `ActiveOrderId`, `HasActiveOrder`. Chưa có `TransferTableInputDto` và `MergeTablesInputDto`.
   - *Giải pháp*: Bổ sung 2 DTOs và 2 phương thức vào `ITableAppService`. Không làm thay đổi các method CRUD hiện có (Đảm bảo 100% tương thích ngược).
2. **`TableAppService.cs`**:
   - *Hiện trạng*: Đã xử lý gán `OccupiedTime = DateTime.Now` khi chuyển `OCCUPIED` và `null` khi chuyển trạng thái khác. Chưa có nghiệp vụ Chuyển bàn và Gộp bàn.
   - *Giải pháp*: Triển khai `TransferTableAsync` và `MergeTablesAsync`. Tận dụng `_orderRepository` và `_realtimeNotifier` đã được inject sẵn trong service.

### 4.2 Tầng Frontend (`Acme.TooHungry/angular`)
1. **Proxy Services (`proxy/tables/`)**:
   - *Hiện trạng*: Chưa có định nghĩa DTO và methods `transferTable`, `mergeTables`.
   - *Giải pháp*: Cập nhật `models.ts` và `table.service.ts`.
2. **Cụm Sub-components Dùng Chung (`shared/components/tables/`)**:
   - *Hiện trạng*: Chưa có thư mục này. Các modal đang bị nhồi nhét trong `table.component.html` và `waiter-tables.component.html`.
   - *Giải pháp*: Tạo mới thư mục `angular/src/app/shared/components/tables/` chứa `TableTransferModalComponent`, `TableMergeModalComponent`, và `TableEndMealModalComponent`.
3. **Màn hình Vận hành Phục vụ (`waiter/tables/`)**:
   - *Hiện trạng*: Đã có hiển thị `occupiedTime`, nhưng chỉ có 1 mức cảnh báo $\ge 90$p; chưa có tính năng Chuyển bàn và Gộp bàn; End Meal modal đang viết inline trong HTML.
   - *Giải pháp*: Cập nhật logic 2 tầng cảnh báo (60p & 90p), thêm nút Chuyển/Gộp bàn trên thẻ bàn, thay thế End Meal modal inline bằng `<app-table-end-meal-modal>`.
4. **Màn hình Quản trị Admin (`table/`)**:
   - *Hiện trạng*: Tệp `table.component.html` dài 2263 dòng, `table.component.ts` dài 1914 dòng, chứa Order Modal nhân bản và 6 modal inline; chưa có `OccupiedTime` và thời lượng dùng bữa trên thẻ bàn.
   - *Giải pháp*: Loại bỏ Order Modal inline, bóc tách `TableFormModalComponent` và `DiningAreaFormModalComponent`, nhúng các shared modals, tích hợp đếm giờ 2 tầng cảnh báo, rút gọn kích thước file xuống dưới 500 dòng HTML và dưới 600 dòng TS.
5. **Đa ngôn ngữ (`assets/i18n/vi.json` & `en.json`)**:
   - *Hiện trạng*: Thiếu các nhãn Chuyển bàn, Gộp bàn, cảnh báo chăm sóc khách 60p, cảnh báo ngồi lâu 90p, các nhãn timeline.
   - *Giải pháp*: Đồng bộ đầy đủ 100% các khóa theo [data-model.md](data-model.md).

---

## 5. Đánh giá Rủi ro & Biện pháp Kiểm soát (Risks & Mitigations)

| Rủi ro Kỹ thuật | Mức độ | Khả năng | Biện pháp Kiểm soát & Xử lý |
|---|---|---|---|
| **Xung đột Bàn đích (Target Concurrency Conflict)** khi 2 nhân viên cùng chuyển khách vào 1 bàn trống cùng thời điểm. | Cao | Thấp | Kiểm tra trạng thái bàn đích ở Backend trong Unit of Work (`targetTable.Status == TableStatus.Available`); nếu bàn đích đã bị chiếm, ném `UserFriendlyException`. Client nhận lỗi hiển thị toast cảnh báo và tự động làm mới danh sách bàn trống. |
| **Mất mát dữ liệu đơn hàng khi Gộp bàn** trong quá trình chuyển các `OrderItem`. | Cao | Rất thấp | Thực thi toàn bộ thao tác gộp món và cập nhật `TotalAmount` trong cùng 1 Database Transaction nguyên tử. Chỉ đóng order phụ sau khi các item đã được liên kết thành công sang order chính. |
| **Tràn bộ nhớ hoặc lệch thời gian dùng bữa** do chạy Timer liên tục trên Client. | Trung bình | Thấp | Timer phía client chỉ đơn thuần đọc hiệu số `Date.now() - new Date(occupiedTime).getTime()` mỗi 30 giây, không cộng dồn biến số đếm độc lập, tự động giải phóng `clearInterval` trong `ngOnDestroy`. |
| **Vỡ giao diện trên các máy POS cảm ứng độ phân giải thấp** (1024×768). | Trung bình | Thấp | Sử dụng CSS Grid / Flexbox responsive linh hoạt: 4 cột trên màn hình rộng, tự co giãn 2-3 cột trên POS/Tablet, đảm bảo touch target $\ge 44 \times 44\text{px}$. |

---

## 6. Kết luận & Độ Sẵn sàng Triển khai (Readiness Assessment)

Hồ sơ kỹ thuật của **RM-017 (Làm lại trang Quản lý bàn)** đã vượt qua toàn diện mọi tiêu chí kiểm định:
- **Tính Nhất quán (Consistency)**: **100%** khớp nối hoàn hảo giữa `spec.md`, `plan.md`, `research.md`, `contracts`, `data-model.md`, và `tasks.md`.
- **Tính Khả thi (Feasibility)**: Phân rã công việc rành mạch, lộ trình bóc tách component an toàn, không gây ảnh hưởng tiêu cực đến các module đang chạy.
- **Độ sẵn sàng (Readiness)**: **PASS 100%**. Toàn bộ hệ thống sẵn sàng tuyệt đối để bước sang giai đoạn thực thi mã nguồn (`/speckit.implement RM-017`).
