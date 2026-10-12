# Kế hoạch Triển khai (Implementation Plan): RM-011 Quản lý Tồn kho & Giao dịch

**Nhánh (Branch)**: `011-rm-011-inventory-transactions` | **Ngày**: 2026-10-09 | **Đặc tả (Spec)**: [specs/011-rm-011-inventory-transactions/spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/011-rm-011-inventory-transactions/spec.md` đã hoàn tất phiên làm rõ (`/speckit.clarify`) ngày 09-10-2026.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Quản lý Tồn kho & Giao dịch (Inventory Transactions & Batch Management) (RM-011)** thuộc phân hệ Vận hành (Operations, Wave 3). Tính năng đóng vai trò trung tâm trong việc quản lý số lượng nhập/xuất/tồn của các nguyên liệu, quản lý chi tiết theo từng lô hàng (`InventoryBatch`), thực thi thuật toán tự động khấu trừ theo hạn sử dụng **FEFO (First Expired, First Out)**, theo dõi biến động bất biến (**Audit Trail** qua `InventoryTransaction`), kiểm kê cân đối kho (**Stock Adjustment**), và hệ thống cảnh báo đa cấp (**Inventory Alerts**).

Các mục tiêu kiến trúc cốt lõi:
1. **Quản lý Nhập kho theo Lô (Batch Inbound)**: Cho phép nhập hàng bằng Đơn vị mua (`PurchaseUnit`), tự động quy đổi ra Đơn vị cơ sở (`BaseUnit`) với tỷ lệ `ConversionFactor` độ chính xác cao (`Decimal(18, 4)`), lưu vết `BatchCode`, `ReceivedAt`, `ExpiryDate`, `UnitCost`, `SupplierId` và tự động sinh giao dịch `IN`.
2. **Khấu trừ Tồn kho Tự động theo FEFO (Domain Service `InventoryManager`)**:
   - Ưu tiên hạn sử dụng gần nhất (`ExpiryDate ASC`), sau đó đến ngày nhập kho (`ReceivedAt ASC`).
   - Tự động bỏ qua các lô hàng tươi sống (`StorageType.FRESH`) đã hết hạn để đảm bảo an toàn vệ sinh thực phẩm.
   - Hỗ trợ trừ nối tiếp qua nhiều lô khi số lượng xuất lớn hơn một lô; không làm âm kho nếu thiếu hàng và trả về `ShortageQuantity`.
   - Sinh giao dịch xuất kho `OUT` cho từng lô tương ứng kèm `UnitCost` của lô đó và mã tham chiếu `ReferenceId`.
3. **Kiểm soát Tương tranh Lạc quan (Optimistic Concurrency Control)**: Sử dụng `ConcurrencyStamp` trên `InventoryBatch` và cơ chế retry tự động (tối đa 3 lần) tại tầng Application để triệt tiêu nguy cơ âm kho khi nhiều đơn hàng POS cùng thanh toán đồng thời.
4. **Nhật ký Biến động Bất biến (Audit Trail)**: `InventoryTransaction` là kho lưu trữ read-only ghi nhận đầy đủ mọi biến động (`IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`), không hỗ trợ API sửa/xóa trực tiếp.
5. **Kiểm kê & Điều chỉnh Tồn kho (Stock Adjustment)**: Cân đối kho thực tế. Thiếu hụt kho bắt buộc chỉ định đích danh từng lô hàng cụ thể để trừ và sinh `ADJUSTMENT_OUT`; thừa kho tự động sinh lô điều chỉnh tăng và sinh `ADJUSTMENT_IN`.
6. **Giám sát Hạn sử dụng & Cảnh báo Đa cấp (Inventory Alerts)**: Phân cấp cảnh báo rõ ràng gồm `EXPIRED_FRESH` (danger), `EXPIRING_TODAY` (cảnh báo cao/ưu tiên xuất số 1), `NEAR_EXPIRY` (warning 3 ngày), và `OUT_OF_STOCK` / `SHORTAGE`.
7. **Tiêu hủy Lô Hàng Quá hạn (Manual Discard)**: Giữ nguyên tồn kho của lô quá hạn để phục vụ kiểm đếm đối soát vật lý; yêu cầu thủ kho/quản lý bấm Discard thủ công kèm lý do bắt buộc để hoàn tất biên bản xuất hủy.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Phiên bản**: C# 13 (.NET 10.0 SDK), TypeScript 5.x, Node.js 20.x
- **Dependencies chính**: ABP Framework 9.x, Entity Framework Core 9.x/10.x, Angular 19+ (Standalone Components, Bootstrap 5)
- **Lưu trữ**: Microsoft SQL Server / PostgreSQL (EF Core Migrations), kiểu số lượng `decimal(18, 4)`
- **Kiểm thử**: xUnit, Shouldly, NSubstitute (`Acme.TooHungry.Domain.Tests`, `Acme.TooHungry.Application.Tests`)
- **Nền tảng đích**: Web application responsive (Desktop Thủ kho/Quản lý, POS Tablet)
- **Loại dự án**: abp-modular / angular-spa
- **Mục tiêu hiệu suất**:
  - API trừ kho FEFO phản hồi < 100ms
  - API lấy danh sách lô phân trang và cảnh báo tồn kho < 200ms
  - Truy vấn lịch sử giao dịch phân trang theo nguyên liệu < 200ms
- **Ràng buộc**:
  - Tuân thủ nghiêm ngặt Hiến pháp Acme.TooHungry (Điều I đến VIII)
  - Phân quyền chặt chẽ (`TooHungryPermissions.Inventories`)
  - Hỗ trợ song ngữ 100% qua `vi.json` và `en.json` (Hiến pháp Điều VII)
  - Tài liệu đặc tả và thiết kế sử dụng Tiếng Việt (Hiến pháp Điều VIII)
- **Quy mô/Phạm vi**: Hàng chục ngàn lô hàng hoạt động, tần suất phát sinh giao dịch liên tục theo từng lượt order món ăn của toàn bộ bàn ăn trong nhà hàng.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi nghiên cứu và thiết kế chi tiết.*

- [x] **I. Domain-Driven Design (DDD) & Phân lớp ABP**:
  - Tầng `Domain.Shared`: `InventoryTransactionType` enum (`IN`, `OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`).
  - Tầng `Domain`: Aggregate Root `InventoryBatch`, Entity `InventoryTransaction`, Domain Service `InventoryManager` chứa toàn bộ thuật toán FEFO và logic kiểm kê điều chỉnh.
  - Tầng `Application.Contracts`: `IInventoryAppService`, các DTOs (`InventoryBatchDto`, `CreateInventoryBatchDto`, `StockAdjustmentRequestDto`, `InventoryAlertDto`, `InventoryTransactionDto`), permissions `TooHungryPermissions.Inventories`.
  - Tầng `Application`: `InventoryAppService` điều phối các use case, ánh xạ DTO, xử lý retry khi có `AbpDbConcurrencyException`.
  - Tầng `EntityFrameworkCore`: Mapping DbContext, cấu hình kiểu dữ liệu `decimal(18, 4)`, đánh composite indexes tối ưu truy vấn FEFO `(IngredientId, IsActive, RemainingQuantity, ExpiryDate)`.
  - Tầng `HttpApi.Host`: REST API endpoints qua `InventoryController`.
- [x] **II. UML & Domain Model Alignment**:
  - Nhất quán với mô hình Visual Paradigm (`RMS-TH.vpp`), quan hệ giữa `InventoryBatch`, `InventoryTransaction`, `Ingredient`, `Order` và `Recipe`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Đảm bảo kiểm thử tự động 100% logic cốt lõi: `InventoryManager_Fefo_Tests`, `InventoryManager_Adjustment_Tests`, `InventoryAppService_Tests`.
- [x] **IV. Hợp đồng API nghiêm ngặt & Tích hợp Module Angular**:
  - API trả về DTOs phân trang chuẩn (`PagedResultDto`), cung cấp interface chuẩn cho hạ tầng Angular (`InventoryService`).
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy**:
  - `InventoryBatch` kế thừa `FullAuditedAggregateRoot<Guid>`, `InventoryTransaction` kế thừa `CreationAuditedEntity<Guid>`. Phân quyền nghiêm ngặt: chỉ `Manager` và `Admin` mới được thực hiện `AdjustStock` và `Discard`.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Các badge trạng thái lô (Active, Depleted, Expired, Expiring Today) sử dụng bảng màu cam, xanh lá, vàng hổ phách và đỏ ấm đồng bộ với chuẩn thiết kế.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% các chuỗi nhãn UI, thông báo lỗi, thông báo thành công đều có trong cả `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ tài liệu kỹ thuật trong thư mục đặc tả được viết bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (specs/)

```text
specs/011-rm-011-inventory-transactions/
├── spec.md                  # Đặc tả nghiệp vụ và các quyết định làm rõ (Clarifications)
├── plan.md                  # Kế hoạch kiến trúc kỹ thuật chi tiết (tệp này)
├── research.md              # Nghiên cứu giải pháp kỹ thuật, thuật toán FEFO và concurrency
├── data-model.md            # Thiết kế mô hình dữ liệu, Enums, Entities, DTOs và Invariants
├── quickstart.md            # Hướng dẫn kiểm thử tự động và thủ công E2E
├── contracts/               # Hợp đồng giao tiếp API REST
│   └── inventory-api.md
└── checklists/
    └── requirements.md      # Bảng kiểm tra chất lượng đặc tả
```

### Mã nguồn Triển khai

```text
# Backend .NET
src/Acme.TooHungry.Domain.Shared/Inventories/
├── InventoryTransactionType.cs                     # Enum: IN, OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT
src/Acme.TooHungry.Domain/Inventories/
├── InventoryBatch.cs                               # Aggregate Root: IngredientId, BatchCode, Quantities, UnitCost, ExpiryDate...
├── InventoryTransaction.cs                         # Entity: IngredientId, BatchId, Quantity, UnitCost, Reason, ReferenceId...
└── InventoryManager.cs                             # Domain Service: DeductFefoAsync, AdjustStockAsync
src/Acme.TooHungry.Application.Contracts/Inventories/
├── IInventoryAppService.cs                         # Interface dịch vụ ứng dụng quản lý kho
└── InventoryDtos.cs                                # DTOs: Batch, Transaction, Adjustment, Alert
src/Acme.TooHungry.Application/Inventories/
└── InventoryAppService.cs                          # Application Service triển khai logic điều phối & retry
src/Acme.TooHungry.HttpApi/Controllers/
└── InventoryController.cs                          # REST API Controller: /api/app/inventory/...
src/Acme.TooHungry.EntityFrameworkCore/
└── EntityFrameworkCore/TooHungryDbContextModelCreatingExtensions.cs # Mapping decimal(18,4) & Indexes

# Frontend Angular
angular/src/app/inventory/
├── inventory.component.ts                          # Quản lý kho, Lô hàng & Giao dịch
├── inventory.component.html
└── expiration-badge/                               # Component huy hiệu cảnh báo hạn dùng
```

---

## Lộ trình Triển khai (Phases of Implementation)

### Giai đoạn 0: Nghiên cứu Kỹ thuật & Quyết định Kiến trúc (`research.md`)
- Nghiên cứu cơ chế Optimistic Concurrency Control với `ConcurrencyStamp` và retry policy.
- Thiết kế thuật toán trừ kho FEFO cho nguyên liệu tươi sống (`StorageType.FRESH`) và đồ khô/đông lạnh.
- Chuẩn hóa cấu hình lưu trữ số thực `decimal(18, 4)` trong EF Core.
- Thiết kế cơ chế lưu vết đơn giá vốn đích danh `UnitCost` cho `InventoryTransaction`.
- Phân định ranh giới giữa RM-011, RM-012 (UI Redesign) và RM-013 (Deactivate/Restore).

### Giai đoạn 1: Mô hình Dữ liệu & Hợp đồng Giao tiếp (`data-model.md`, `contracts/`)
- Hoàn thiện mô hình thực thể `InventoryBatch`, `InventoryTransaction`.
- Cấu hình chỉ mục cơ sở dữ liệu (Database Composite Indexes) tối ưu hóa truy vấn FEFO.
- Đặc tả hợp đồng API REST trong `contracts/inventory-api.md`.
- Xây dựng tài liệu hướng dẫn kiểm thử tự động và thủ công trong `quickstart.md`.

### Giai đoạn 2: Cập nhật & Kiểm thử Tự động (Automated Verification)
- Cập nhật trường `UnitCost` vào entity `InventoryTransaction` và migration nếu cần.
- Bổ sung Unit Test cho cơ chế retry tương tranh và cảnh báo `EXPIRING_TODAY`.
- Chạy toàn bộ test suite: `dotnet test` cho cả Domain và Application tests.
