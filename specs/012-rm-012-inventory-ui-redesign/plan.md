# Kế hoạch Triển khai (Implementation Plan): RM-012 Tái thiết kế Giao diện Quản lý Tồn kho & Lô hàng

**Nhánh (Branch)**: `012-rm-012-inventory-ui-redesign` | **Ngày**: 2026-10-09 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/012-rm-012-inventory-ui-redesign/spec.md` kết hợp kết quả phiên làm rõ yêu cầu `/speckit.clarify`.

---

## Tóm tắt (Summary)

Nâng cấp và tái cấu trúc toàn diện phân hệ giao diện Quản lý Tồn kho (`/inventory`):
1. **Header một cấp tinh gọn & 4 Thẻ KPI Tồn kho**: Gom toàn bộ tiêu đề trang và cụm nút thao tác cốt lõi (`[Làm mới]`, `[+ Thiết lập tồn kho]`, `[+ Nhập kho]`) lên thanh công cụ duy nhất. Bổ sung 4 thẻ chỉ số KPI (*Tổng nguyên liệu*, *Tồn an toàn*, *Cảnh báo thiếu*, *Lô quá hạn khẩn cấp*).
2. **Banner Cảnh báo Tồn kho Thông minh (Alerts Banner)**: Kết nối API `GET /api/app/inventory/alerts` từ RM-011, làm nổi bật cảnh báo nguy cấp (lô tươi sống `FRESH` quá hạn kèm nút `[Xuất hủy ngay]`), hỗ trợ xem chi tiết và đóng tạm thời.
3. **Cấu trúc 3 Tab Chuẩn Cam & Trắng**:
   - Tab 1: **Tổng quan Tồn kho** (`StockOverview`) — Bổ sung nút `[Xem các lô]` mở Centered Modal (size 'xl') xem chi tiết lô hàng FEFO, và nút `[Lịch sử biến động]` chuyển thẳng sang Tab 3.
   - Tab 2: **Danh sách Lô hàng** (`BatchList`) — Bảng tra cứu lô toàn kho, bộ lọc trạng thái và nút xuất hủy lô quá hạn.
   - Tab 3: **Lịch sử Giao dịch** (`TransactionHistory`) — Tự động tải giao dịch của nguyên liệu đầu tiên, Dropdown tìm kiếm nguyên liệu, hiển thị biến động (+/-), mã lô, giá vốn `UnitCost`.
4. **Modal Xuất hủy Lô hàng (`DiscardBatchModalComponent`)**: Hộp thoại xác nhận chuyên dụng có sẵn dropdown lý do mẫu (Quá hạn, Hư hỏng biến chất, Rách bao bì) kèm ô nhập ghi chú chi tiết trước khi gọi API `POST /api/app/inventory/batches/{id}/discard`.
5. **Đồng bộ Proxy API & Chuẩn hóa 100% Đa ngôn ngữ (i18n)**:
   - Sửa URL proxy `getTransactions` trong `inventory.service.ts` thành `/api/app/inventory/transactions/${ingredientId}`.
   - Xóa bỏ toàn bộ nhãn hardcode tiếng Việt trong template (`<th>NGUYÊN LIỆU</th>`, `<th>VÒNG ĐỜI BẢO QUẢN</th>`), sửa format select phân trang `::RowsPerPage`.
   - Bổ sung 100% khóa bản địa hóa vào `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

**Ngôn ngữ/Phiên bản**: TypeScript 5.6, HTML5, SCSS, C# 13, .NET 10.0  
**Dependencies chính**: Angular 19 (Standalone Components), ABP Framework 9.x (`CoreModule`, `ThemeSharedModule`, `RestService`, `abpLocalization`), Bootstrap 5  
**Lưu trữ**: PostgreSQL (EF Core 9) — Tái sử dụng dữ liệu từ `InventoryBatch`, `Ingredient`, `InventoryTransaction` qua các Application Services có sẵn của RM-011  
**Kiểm thử**: Component compilation/build check, Visual E2E verification qua browser  
**Nền tảng đích**: Web Application (Angular Single Page Application)  
**Loại dự án**: Frontend UI Refactoring & Component Modularization trong ABP Modular Monolith  
**Mục tiêu hiệu suất**: Tải trang và chuyển tab tức thì (< 100ms), mở modal chi tiết lô hàng mượt mà (< 150ms)  
**Ràng buộc**:
- Tuân thủ tuyệt đối Hiến pháp Acme.TooHungry (Điều VI - Giao diện Cam & Trắng, Điều VII - Song ngữ Tiếng Việt & Tiếng Anh).
- Không phá vỡ các luồng nghiệp vụ backend đã xây dựng và kiểm thử đạt 100% tại `RM-011`.

---

## Kiểm tra Hiến pháp (Constitution Check)

*CỔNG: Phải vượt qua trước và sau thiết kế.*

| Nguyên tắc | Đánh giá Kiến trúc | Trạng thái |
| :--- | :--- | :---: |
| **I. Domain-Driven Design & Phân lớp ABP** | Không thay đổi logic tầng domain. Frontend Angular giao tiếp chặt chẽ qua Application Service Proxies định kiểu mạnh (`InventoryService`, `IngredientService`). | **ĐẠT** |
| **II. UML & Sự đồng nhất của Domain Model** | Khớp 100% với các thực thể `InventoryBatch`, `Ingredient`, `InventoryTransaction` đã mô hình hóa trong `RMS-TH.vpp`. | **ĐẠT** |
| **III. Test-First & Cổng chất lượng tự động** | Đáp ứng trọn vẹn 6 kịch bản kiểm thử xác thực tại `quickstart.md`. Không gây ảnh hưởng đến 95 integration tests backend của RM-011. | **ĐẠT** |
| **IV. Hợp đồng API & Tích hợp Module Angular** | Sửa endpoint proxy `getTransactions` để khớp chuẩn xác 100% với Controller `GET /api/app/inventory/transactions/{ingredientId}`. | **ĐẠT** |
| **V. Bảo mật & Phân quyền ABP** | Giữ nguyên các chính sách phân quyền `TooHungryPermissions.Inventories.*` (`Default`, `Create`, `Adjust`, `Discard`). | **ĐẠT** |
| **VI. Nhận diện UI/UX Cam & Trắng** | Màu chủ đạo cam `#EA580C`, nền ấm `#FFF3E8`, thẻ nền trắng `#FFFFFF` bo góc mềm mại 12-16px, đổ bóng nhẹ theo Điều VI. | **ĐẠT** |
| **VII. Quốc tế hóa (I18N)** | 100% nhãn, badge, modal, placeholder đều được cấu hình trong `vi.json` và `en.json`. Không hardcode text thô. | **ĐẠT** |
| **VIII. Ngôn ngữ Tài liệu** | Toàn bộ tài liệu đặc tả, kế hoạch, nghiên cứu, hợp đồng được biên soạn bằng Tiếng Việt. | **ĐẠT** |

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu (tính năng này)

```text
specs/012-rm-012-inventory-ui-redesign/
├── plan.md              # File này (kế hoạch triển khai tổng thể)
├── research.md          # Nghiên cứu kỹ thuật & 6 quyết định thiết kế
├── data-model.md        # ViewModels, DTOs & trạng thái giao diện UI
├── quickstart.md        # Hướng dẫn kiểm thử trực quan 6 kịch bản
├── contracts/
│   └── inventory-ui-contract.md # Hợp đồng Design tokens, API proxy & từ điển i18n
└── tasks.md             # Kế hoạch công việc chi tiết (sinh ở bước /speckit.tasks)
```

### Mã nguồn Thực tế Cần Chỉnh sửa & Bổ sung

```text
src/Acme.TooHungry.Domain.Shared/
└── Localization/TooHungry/
    ├── vi.json                               # Bổ sung các khóa tiếng Việt cho KPI, Alert, Modal, Tab 3
    └── en.json                               # Bổ sung các khóa tiếng Anh tương ứng

angular/src/app/proxy/inventories/
└── inventory.service.ts                      # Đồng bộ route getTransactions(ingredientId) & discardBatch

angular/src/app/inventory/
├── ingredient-batches-modal/                 # [MỚI] Centered Modal (size 'xl') xem chi tiết lô theo FEFO
│   ├── ingredient-batches-modal.component.html
│   ├── ingredient-batches-modal.component.scss
│   └── ingredient-batches-modal.component.ts
├── discard-batch-modal/                      # [MỚI] Modal xác nhận xuất hủy lô kèm dropdown lý do mẫu
│   ├── discard-batch-modal.component.html
│   ├── discard-batch-modal.component.scss
│   └── discard-batch-modal.component.ts
├── inventory.component.html                  # Header 1 cấp, 4 Thẻ KPI, Alert Banner, 3 Tabs, Tab 3 UI
├── inventory.component.scss                  # Styles chuẩn Cam & Trắng, KPI Cards, Alert Banner, Tabs
└── inventory.component.ts                    # State management cho KPI, Alerts, Tab 3, Modal triggers
```

**Quyết định Cấu trúc**:
- Tách `IngredientBatchesModalComponent` và `DiscardBatchModalComponent` thành 2 standalone components riêng biệt trong thư mục `inventory/` để tái sử dụng sạch sẽ, giữ cho `InventoryComponent` không bị phình to và dễ bảo trì.
- Cập nhật trực tiếp `InventoryService` proxy để khắc phục triệt để lỗi endpoint `transactions`.

---

## Theo dõi Độ phức tạp (Complexity Tracking)

> Không có vi phạm kiến trúc nào cần biện minh. Thiết kế thuần túy tối ưu hóa frontend UI/UX, tái sử dụng 100% backend API hiện có từ RM-011 và tuân thủ tuyệt đối Hiến pháp dự án.
