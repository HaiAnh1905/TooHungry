# Báo cáo Phân tích Kiểm chéo (Cross-Artifact Analysis): RM-015 Điều hướng & Bố cục Waiter

**Tính năng**: `RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout)`  
**Ngày thực hiện**: 2026-10-12  
**Trạng thái**: Đạt Phê duyệt 100% (Passed - Ready for Implementation)  
**Tài liệu đối chiếu**:
- Đặc tả Nghiệp vụ: [spec.md](spec.md)
- Kế hoạch Triển khai: [plan.md](plan.md)
- Danh sách Công việc: [tasks.md](tasks.md)
- Hợp đồng Kiến trúc: [waiter-routing-layout-contracts.md](contracts/waiter-routing-layout-contracts.md)

---

## 1. Mục tiêu Phân tích

Tiến hành kiểm chéo toàn diện tính nhất quán, tính khả thi và độ bao phủ giữa:
1. **Yêu cầu Nghiệp vụ (`spec.md`)** với **Giải pháp Kỹ thuật (`plan.md`)**.
2. **Kế hoạch Triển khai (`plan.md`)** với **Danh sách Công việc Cụ thể (`tasks.md`)**.
3. **Hiện trạng Mã nguồn thực tế** với **Các thay đổi dự kiến thực thi**.

---

## 2. Ma trận Ánh xạ & Độ Phủ (Traceability Matrix)

### 2.1 Ánh xạ User Stories ↔ Yêu cầu Chức năng ↔ Tasks Triển khai

| User Story | Yêu cầu Chức năng (FR) | Tiêu chí Thành công (SC) | Tasks Triển khai (`tasks.md`) | Đánh giá Khớp nối |
|---|---|---|---|---|
| **US1**: Tự động Điều hướng sau Đăng nhập (P1) | FR-001, FR-002, FR-003, FR-018 | SC-001, SC-002 | `T004`, `T005` | **Khớp 100%**: Điều chỉnh `AppComponent` sau `token_received` và route redirect mặc định. |
| **US2**: Cấu trúc Bố cục Waiter 3 Vùng (P1) | FR-004, FR-005, FR-006, FR-007, FR-008, FR-016 | SC-003, SC-005, SC-007 | `T006`, `T007`, `T008` | **Khớp 100%**: Tạo `WaiterLayoutComponent` chuẩn Cam & Trắng, Topbar 64px, Sidebar 280px, Content `<router-outlet>`, lối tắt Admin. |
| **US3**: Bộ Gác cổng Tuyến đường (P1) | FR-009, FR-012 | SC-002 | `T009`, `T010` | **Khớp 100%**: Tạo `waiterAuthGuard` kiểm tra roles `Waiter`, `Manager`, `Admin`, phân quyền ABP và bảo vệ lồng tuyến đường. |
| **US4**: Sidebar Ngữ cảnh Động Service Portal (P1) | FR-009, FR-010, FR-011 | SC-006 | `T002`, `T011`, `T012` | **Khớp 100%**: Tạo `WaiterSidebarService`, cắm ghép `<ng-template>` từ `WaiterTablesComponent` và `WaiterOrderComponent`. |
| **US5**: Responsive Drawer & Touch-Friendly (P2) | FR-010, FR-013, FR-015 | SC-004 | `T013`, `T014` | **Khớp 100%**: Offcanvas Drawer cho màn hình < 992px, nút mở có badge, touch target >= 44×44px. |
| **Hạ tầng Dùng chung & Ngoại lệ Standalone** | FR-014, FR-017, NFR-001..005 | SC-005 | `T001`, `T003`, `T015`, `T016`, `T017`, `T018` | **Khớp 100%**: Từ điển i18n song ngữ, models, Standalone Route `/payment/:orderId`, build verification. |

**Độ phủ Yêu cầu (Coverage Ratio)**: **18/18 FR (100%)**, **5/5 NFR (100%)**, **7/7 SC (100%)**. Không có yêu cầu nào bị bỏ sót (no gaps) và không có task nào không rõ mục đích (no orphaned tasks).

---

## 3. Kiểm tra Tính Nhất quán với 5 Quyết định Kiến trúc (`/speckit.clarify`)

1. **D1 (Quản lý Sidebar ngữ cảnh động qua Service Portal)**:
   - `spec.md`: Mục Làm rõ Q1 & FR-009.
   - `plan.md`: Mục 1 Nghiên cứu kiến trúc & Giai đoạn 1, 3.
   - `tasks.md`: `T002` (xây dựng service), `T011` (tích hợp tables), `T012` (tích hợp order).
   - *Kết luận*: **Đồng nhất hoàn hảo**.

2. **D2 (Lối tắt Quay lại Quản trị cho Manager/Admin trên Topbar)**:
   - `spec.md`: Mục Làm rõ Q2 & FR-007, SC-007.
   - `plan.md`: Mục 2 Bối cảnh & Giai đoạn 2.
   - `tasks.md`: `T006` (logic kiểm tra roles), `T007` (nút HTML).
   - *Kết luận*: **Đồng nhất hoàn hảo**.

3. **D3 (Tự động Tính Ca trực theo Giờ Thực tế)**:
   - `spec.md`: Mục Làm rõ Q3 & FR-006.
   - `plan.md`: Mục 4 Nghiên cứu tính ca trực.
   - `tasks.md`: `T006` (thuật toán phân ca: 09-15h Sáng, 15-23h Tối, ngoài giờ), `T007` (badge hiển thị).
   - *Kết luận*: **Đồng nhất hoàn hảo**.

4. **D4 (Tách biệt Màn hình Thanh toán RM-016 thành Standalone Route)**:
   - `spec.md`: Mục Làm rõ Q4 & FR-014, EC-004.
   - `plan.md`: Mục 5 Nghiên cứu Standalone Route.
   - `tasks.md`: `T015` (cấu hình route `/payment/:orderId` độc lập ngoài layout Waiter).
   - *Kết luận*: **Đồng nhất hoàn hảo**.

5. **D5 (Responsive Drawer Offcanvas < 992px cho Tablet/Mobile)**:
   - `spec.md`: Mục Làm rõ Q5 & FR-013, SC-004.
   - `plan.md`: Mục 6 Nghiên cứu Tablet UX.
   - `tasks.md`: `T013` (giao diện Drawer), `T014` (chuẩn hóa touch target >= 44×44px).
   - *Kết luận*: **Đồng nhất hoàn hảo**.

---

## 4. Khảo sát Hiện trạng Mã nguồn & Đánh giá Tác động (Codebase Gap Analysis)

### 4.1 Điểm xung đột hiện tại trong code
1. **`angular/src/app/app.component.ts`**:
   - *Hiện trạng*: Dòng 36-37 đang điều hướng `Waiter` về `/table` (đường dẫn CRUD cấu hình bàn của Admin cũ).
   - *Tác động*: Sửa đổi 1 dòng trỏ về `/waiter/tables`. Không ảnh hưởng đến các vai trò khác (`Administrator`, `Manager`, `InventoryStaff`).
2. **`angular/src/app/app.routes.ts`**:
   - *Hiện trạng*: Khai báo các route đơn lẻ `waiter/tables`, `waiter/order/:tableId`, `waiter/payment/:orderId`.
   - *Tác động*: Tái cấu trúc thành cụm cha `path: 'waiter'` sử dụng `WaiterLayoutComponent` với các con `tables`, `order/:tableId` và redirect `/payment/:orderId`.
3. **Thư mục `angular/src/app/waiter/`**:
   - *Hiện trạng*: Đã có `tables/`, `order/`, `reservation-modal/`. Chưa có `layout/`, `guards/`, `services/`, `models/`.
   - *Tác động*: Tạo mới hoàn toàn các thư mục con này theo mô hình module độc lập, không ghi đè logic nghiệp vụ sẵn có.
4. **`WaiterTablesComponent` & `WaiterOrderComponent`**:
   - *Hiện trạng*: Đang tự render thanh toolbar/sidebar bên trong file HTML của mình.
   - *Tác động*: Bọc khối bộ lọc vào `<ng-template>` và đăng ký qua `WaiterSidebarService`. Mã logic nghiệp vụ xử lý dữ liệu và signals giữ nguyên 100%.

---

## 5. Đánh giá Rủi ro & Chiến lược Kiểm soát (Risks & Mitigations)

| Rủi ro Kỹ thuật | Mức độ | Khả năng xảy ra | Biện pháp Kiểm soát & Xử lý |
|---|---|---|---|
| **Vỡ giao diện CSS khi bọc `<ng-template>`**: Bọc nội dung lọc vào template có thể làm thay đổi cấu trúc thẻ cha flexbox/grid. | Trung bình | Thấp | Khung Sidebar của `WaiterLayoutComponent` được cấp sẵn kích thước chuẩn (280px, padding, overflow-y), các component con giữ nguyên class CSS nội bộ. |
| **Race condition khi nạp quyền hạn trong `waiterAuthGuard`**: Sau khi đăng nhập, `currentUser` có thể chưa kịp nạp vào bộ nhớ. | Trung bình | Thấp | Sử dụng `configStateService.getAll$()` và cơ chế tự động refresh tương tự pattern của `smartPermissionGuard`. |
| **Màn hình thanh toán RM-016 bị kẹt trong Waiter Layout**: Khi chuyển trang thanh toán từ nút kết thúc bữa ăn bị giữ lại Topbar. | Thấp | Rất thấp | Tuyến đường `/payment/:orderId` được cấu hình độc lập hoàn toàn ngoài nhánh con của `WaiterLayoutComponent`. |

---

## 6. Kết luận & Phê duyệt (Final Verdict)

- **Tính toàn vẹn**: 100% khớp nối giữa Spec ↔ Plan ↔ Tasks.
- **Tính khả thi**: Không có bất kỳ rào cản kỹ thuật hay xung đột kiến trúc nào với các module đã hoàn thiện (RM-001, RM-002, RM-003, RM-008, RM-010).
- **Trạng thái**: **ĐẠT CHUẨN PHÊ DUYỆT (PASSED)**.

Toàn bộ hệ thống sẵn sàng 100% để bước sang giai đoạn thực thi mã nguồn (`/speckit.implement RM-015`).
