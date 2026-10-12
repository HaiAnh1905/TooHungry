# Kế hoạch Triển khai (Implementation Plan): RM-013 Tồn kho - Khóa/Khôi phục (Inventory Deactivate & Restore)

**Nhánh (Branch)**: `013-rm-013-inventory-deactivate-restore` | **Ngày**: 2026-10-12 | **Đặc tả (Spec)**: [spec.md](./spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/013-rm-013-inventory-deactivate-restore/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 12-10-2026.

---

## 1. Tóm tắt (Summary)

Xây dựng và hoàn thiện trọn vẹn tính năng **Tồn kho - Khóa/Khôi phục (RM-013)** thuộc phân hệ Vận hành Kho hàng (Operations, Wave 3). Tính năng cung cấp khả năng kiểm soát vòng đời tạm ngưng, cách ly an toàn và khôi phục ở cả 2 cấp độ: **Mặt hàng nguyên liệu (`Ingredient`)** và **Lô hàng thực tế (`InventoryBatch`)**:
1. **Tại trang Quản lý Tồn kho (`/inventory`)**:
   - **Tab 1 (Tổng quan Tồn kho)**: Bổ sung bộ lọc 3 trạng thái (`Đang hoạt động`, `Đã tạm ngưng`, `Tất cả`). Cung cấp modal tạm ngưng bắt buộc nhập lý do (cảnh báo nếu `CurrentStock > 0`). Khi mặt hàng bị khóa, cột thao tác chỉ hiển thị duy nhất 2 nút: **Kích hoạt lại** (Confirm Modal) và **Chỉnh sửa** (`MinStock`).
   - **Vô hiệu hóa Dây chuyền (Cascading Deactivation)**: Tự động vô hiệu hóa `Ingredient` $\rightarrow$ `Recipe` $\rightarrow$ `Dish` $\rightarrow$ đánh dấu `[Đã ngừng phục vụ]` trên `DailyMenuItem`, chặn gọi món mới trên POS nhưng bảo toàn các đơn hàng dở dang tại bàn để thanh toán bình thường.
   - **Tab 2 (Danh sách Lô hàng)**: Cho phép thủ kho tạm khóa từng lô hàng cụ thể (`InventoryBatch`) kèm lý do mẫu (Chờ kiểm định, Nghi ngờ biến chất, Lỗi bao bì, Khác) và ghi chú chi tiết. Lô bị tạm khóa tự động loại trừ khỏi thuật toán xuất kho FEFO mà không làm mất số lượng tồn.
2. **Tại phân hệ Quản lý Nguyên liệu (`/ingredients`)**:
   - Bổ sung màn hình riêng biệt `/ingredients/deactivated` hiển thị bảng 4 cột tinh gọn (STT, Tên nguyên liệu, Lý do, Thao tác), có nút điều hướng qua lại 2 chiều.
3. **Thiết lập Tồn kho Thông minh (Smart Setup / Restore)**:
   - Phát hiện nguyên liệu đã tồn tại nhưng đang bị khóa, hiển thị popup đề xuất khôi phục khả dụng và cập nhật mức tồn tối thiểu mới thay vì báo lỗi trùng lặp.
4. **Phân hệ Công thức & Món ăn (Recipe & Dishes)**:
   - Hiển thị huy hiệu cảnh báo vàng cam `[Chứa nguyên liệu tạm ngưng]` trên danh sách và highlight dòng nguyên liệu trong modal chi tiết kèm tooltip lý do.

---

## 2. Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ / Phiên bản**: C# 13, .NET 10.0 SDK.
- **Dependencies chính**: ABP Framework 9.x (`Volo.Abp.Ddd.Domain`, `Volo.Abp.Application`, `Volo.Abp.EntityFrameworkCore`).
- **Lưu trữ**: PostgreSQL / SQL Server qua Entity Framework Core 10 (Code-First Migrations).
- **Frontend**: Angular 19 (mẫu ABP Angular), TypeScript 5.x, SCSS.
- **Kiểm thử**: xUnit, Shouldly, NSubstitute (Domain.Tests, Application.Tests, EfCore.Tests).
- **Nền tảng đích**: Web Application / REST API Server.
- **Loại dự án**: Web SPA App (Angular) kết nối ABP REST Backend.
- **Mục tiêu hiệu suất**: Thời gian phản hồi API khóa/khôi phục < 200ms; cập nhật trạng thái UI tức thì không cần reload toàn bộ trang.
- **Ràng buộc**:
  - Hỗ trợ đầy đủ Quốc tế hóa (I18N) song ngữ Tiếng Việt (`vi.json`) và Tiếng Anh (`en.json`).
  - Giao diện tuân thủ tuyệt đối bộ nhận diện Cam & Trắng (Orange & White Theme: `#EA580C`, `#FFF3E8`, `#FFFFFF`, bo góc 12px - 16px).
  - Nghiêm cấm đặt logic nghiệp vụ trong Application Services hoặc Controller.
- **Quy mô/Phạm vi**: Xử lý hàng nghìn mặt hàng nguyên liệu và hàng chục nghìn lô hàng theo thời gian thực.

---

## 3. Kiểm tra Hiến pháp (Constitution Check)

*CỔNG: Phải vượt qua trước nghiên cứu Phase 0. Kiểm tra lại sau thiết kế Phase 1.*

| Cổng Hiến pháp | Tiêu chí đánh giá | Trạng thái | Bằng chứng thiết kế / Giải pháp kỹ thuật |
| :--- | :--- | :---: | :--- |
| **I. Domain-Driven Design & ABP Layering** | Logic nghiệp vụ phải nằm trong Domain Layer | **PASSED** | Logic chuyển đổi trạng thái `Deactivate(reason)` và `Reactivate()` nằm trong Aggregate Root `Ingredient`, `InventoryBatch`, `Recipe`, `Dish` và các Domain Manager (`IngredientManager`, `InventoryManager`). Application Service chỉ điều phối DTO và transaction. |
| **II. UML & Domain Model Alignment** | Phù hợp với mô hình kiến trúc `RMS-TH.vpp` | **PASSED** | Mô hình hóa đúng thực thể `InventoryBatch` chứa `DeactivationReason`, kế thừa `FullAuditedAggregateRoot<Guid>`, giữ nguyên toàn vẹn ranh giới Aggregate của RM-005 và RM-011. |
| **III. Test-First & Quality Gates** | Độ phủ kiểm thử tự động toàn diện | **PASSED** | Lập kế hoạch kiểm thử cho Domain Tests (`IngredientDomainTests`, `InventoryBatchDomainTests`) và Application Tests (`IngredientAppServiceTests`, `InventoryAppServiceTests`) bao phủ tất cả 5 User Stories. |
| **IV. Strict API Contract & Angular Modular** | API định kiểu mạnh, Angular qua Service Proxy | **PASSED** | Tất cả DTOs được định nghĩa trong `Application.Contracts`, endpoint định tuyến rõ ràng, Angular sử dụng Service Proxy strongly-typed. |
| **V. Security & Auditing** | `FullAuditedAggregateRoot`, phân quyền ABP | **PASSED** | Các thực thể kế thừa `FullAuditedAggregateRoot<Guid>`. Phân quyền chi tiết: Vô hiệu hóa mặt hàng yêu cầu `Manager`/`Admin` (`TooHungryPermissions.Inventories.Edit/Delete`); Tạm khóa lô cho phép cả `WarehouseKeeper`, `Manager`, `Admin`. |
| **VI. UI/UX Consistency (Orange & White Theme)** | Theme Cam & Trắng đặc trưng | **PASSED** | Modal xác nhận, huy hiệu cảnh báo vàng cam, thanh lọc trạng thái và bảng 4 cột tuân thủ chuẩn màu `#EA580C`, `#FFF3E8`, `#FFFFFF` với border radius 12-16px. |
| **VII. Quốc tế hóa & Nội địa hóa (I18N)** | Song ngữ Việt - Anh, không hardcode | **PASSED** | 100% các nhãn, lý do mẫu, thông báo cảnh báo và thông điệp lỗi được đồng bộ song ngữ trong `vi.json` và `en.json`. |
| **VIII. Ngôn ngữ Tài liệu (Documentation Language)** | Toàn bộ tài liệu viết bằng Tiếng Việt | **PASSED** | Toàn bộ tài liệu (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `api-contracts.md`) được viết 100% bằng Tiếng Việt. |

---

## 4. Cấu trúc Dự án (Project Structure)

### 4.1. Tài liệu (specs/013-rm-013-inventory-deactivate-restore/)
```text
specs/013-rm-013-inventory-deactivate-restore/
├── spec.md              # Đặc tả nghiệp vụ chuẩn hóa (kết quả /speckit.specify & /speckit.clarify)
├── plan.md              # File này (kết quả /speckit.plan)
├── research.md          # Kết quả nghiên cứu kiến trúc Phase 0
├── data-model.md        # Thiết kế mô hình dữ liệu Phase 1
├── quickstart.md        # Hướng dẫn kiểm thử nhanh Phase 1
├── contracts/
│   └── api-contracts.md # Hợp đồng API REST Phase 1
├── checklists/
│   └── requirements.md  # Checklist đánh giá chất lượng đặc tả
└── tasks.md             # Danh sách công việc chi tiết (sinh ở bước /speckit.tasks)
```

### 4.2. Mã nguồn (Root Repository)
```text
src/Acme.TooHungry.Domain/
├── Ingredients/
│   ├── Ingredient.cs               # Phương thức Deactivate, Reactivate, Restore
│   └── IngredientManager.cs        # Điều phối Cascading Deactivation sang Recipe & Dish
├── Inventories/
│   ├── InventoryBatch.cs           # Bổ sung trường DeactivationReason, Deactivate(), Reactivate()
│   └── InventoryManager.cs         # Xử lý FEFO bỏ qua lô Inactive
├── Recipes/
│   └── Recipe.cs                   # Deactivate(reason), Reactivate()
└── Dishes/
    └── Dish.cs                     # Deactivate(reason), Reactivate()

src/Acme.TooHungry.Application.Contracts/
├── Ingredients/
│   ├── IIngredientAppService.cs    # GetListAsync(filter IsActive), DeactivateAsync, ReactivateAsync, SmartRestoreAsync
│   └── IngredientDtos.cs           # DTOs liên quan
├── Inventories/
│   ├── IInventoryAppService.cs     # DeactivateBatchAsync, ReactivateBatchAsync, GetBatchesAsync(filter IsActive)
│   └── InventoryBatchDtos.cs       # DeactivateBatchDto, InventoryBatchDto (bổ sung DeactivationReason)
└── Permissions/
    └── TooHungryPermissions.cs     # Quyền hạn khóa/khôi phục

src/Acme.TooHungry.Application/
├── Ingredients/
│   └── IngredientAppService.cs     # Triển khai điều phối use case nguyên liệu
├── Inventories/
│   └── InventoryAppService.cs      # Triển khai điều phối use case lô hàng
└── TooHungryApplicationMappers.cs  # Ánh xạ DTOs

src/Acme.TooHungry.EntityFrameworkCore/
└── Migrations/
    └── [Timestamp]_Add_DeactivationReason_To_InventoryBatches.cs

angular/src/app/
├── inventory/
│   ├── inventory.component.ts      # Bổ sung bộ lọc Status Tab 1, tích hợp modal Deactivate & Reactivate
│   ├── inventory.component.html    # Cập nhật UI Tab 1 & Tab 2 (Action buttons)
│   ├── deactivate-modal/           # Modal nhập lý do vô hiệu hóa mặt hàng (Tab 1)
│   └── deactivate-batch-modal/     # Modal chọn lý do mẫu tạm khóa lô hàng (Tab 2)
├── ingredient/
│   ├── deactivated-ingredients/    # Màn hình riêng biệt /ingredients/deactivated (Bảng 4 cột)
│   └── ingredient.component.ts     # Nút điều hướng 2 chiều sang trang deactivated
└── recipe/
    └── recipe.component.html       # Huy hiệu [Chứa nguyên liệu tạm ngưng] và highlight modal
```

---

## 5. Lộ trình Triển khai Chi tiết

### Giai đoạn 0: Chuẩn bị & Mô hình hóa Domain
1. Bổ sung `DeactivationReason` vào thực thể `InventoryBatch.cs` và cập nhật constructor/methods `Deactivate(reason)`, `Reactivate()`.
2. Tạo EF Core migration bổ sung cột `DeactivationReason` vào bảng `AppInventoryBatches`. Chạy `DbMigrator`.
3. Cập nhật `InventoryManager.cs` để thuật toán FEFO tự động lọc bỏ các lô hàng có `IsActive == false`.
4. Đảm bảo `IngredientManager.cs` thực hiện Cascading Deactivation sang `Recipe` và `Dish`, bảo toàn các đơn hàng POS dở dang.

### Giai đoạn 1: Application Layer & API Endpoints
1. Bổ sung `DeactivateBatchDto`, cập nhật `InventoryBatchDto` và `GetInventoryBatchesInput` trong `Application.Contracts`.
2. Triển khai `DeactivateBatchAsync` và `ReactivateBatchAsync` trong `InventoryAppService.cs`.
3. Cập nhật `InventoryController.cs` để xuất bản REST API endpoints.
4. Cập nhật DTO mappers trong `TooHungryApplicationMappers.cs`.

### Giai đoạn 2: Frontend Angular & Trải nghiệm Người dùng
1. Cập nhật `InventoryComponent` (Tab 1):
   - Thêm bộ lọc Trạng thái: `Đang hoạt động` (mặc định), `Đã tạm ngưng`, `Tất cả`.
   - Tạo Modal nhập lý do khi bấm Tạm ngưng (hiển thị cảnh báo màu cam nếu `CurrentStock > 0`).
   - Cột thao tác của item bị khóa chỉ hiển thị đúng 2 nút: Kích hoạt lại (Confirm Modal) và Chỉnh sửa.
2. Cập nhật `InventoryComponent` (Tab 2):
   - Thêm nút Tạm khóa lô (mở Modal chọn danh mục lý do mẫu + ghi chú) và nút Khôi phục lô.
3. Xây dựng màn hình `/ingredients/deactivated`:
   - Component `DeactivatedIngredientsComponent` hiển thị bảng 4 cột tinh gọn, có phân trang và nút điều hướng về `/ingredients`.
4. Cập nhật giao diện Công thức & Món ăn:
   - Hiển thị badge `[Chứa nguyên liệu tạm ngưng]` và highlight màu cam dòng nguyên liệu bị khóa trong modal.
5. Cập nhật từ điển song ngữ `vi.json` và `en.json`.

### Giai đoạn 3: Kiểm thử Tự động & Hoàn thiện
1. Viết Unit Tests trong `Domain.Tests` cho `InventoryBatchDomainTests` (Deactivate/Reactivate lô, FEFO bỏ qua lô khóa).
2. Viết Unit Tests trong `Application.Tests` cho `InventoryAppServiceTests` và `IngredientAppServiceTests` (Cascading deactivation, Smart restore, Permissions check).
3. Kiểm thử tích hợp UI và luồng POS đặt món.

---

## 6. Theo dõi Độ phức tạp (Complexity Tracking)

> **Tuân thủ Hiến pháp: Không có vi phạm kiến trúc nào phát sinh.**

| Thành phần | Đánh giá độ phức tạp | Biện pháp kiểm soát |
| :--- | :--- | :--- |
| **Cascading Deactivation** | Trung bình (cập nhật từ Ingredient sang Recipe, Dish, DailyMenu) | Thực hiện trong một Transaction khép kín tại Domain Service (`IngredientManager`), tránh phân tán logic. |
| **FEFO Exclusion** | Thấp | Bổ sung điều kiện `x.IsActive` vào truy vấn lấy danh sách lô hàng khả dụng FEFO trong `InventoryManager`. |
| **Smart Restoration** | Thấp | Bắt mã lỗi nghiệp vụ tại client và mở hộp thoại xác nhận khôi phục thay vì để ứng dụng crash lỗi. |
