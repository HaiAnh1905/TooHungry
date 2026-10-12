# Kế hoạch Triển khai (Implementation Plan): RM-010 POS / Đơn hàng

**Nhánh (Branch)**: `010-rm-010-pos-ordering-and-billing` | **Ngày**: 2026-10-09 | **Đặc tả (Spec)**: [specs/010-rm-010-pos-ordering-and-billing/spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/010-rm-010-pos-ordering-and-billing/spec.md` đã hoàn tất phiên làm rõ (`/speckit.clarify`) ngày 09-10-2026.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **POS / Đơn hàng (Orders & Dining Session Management) (RM-010)** thuộc phân hệ Vận hành (Operations, Wave 3). Tính năng cung cấp giao diện gọi món chuyên biệt cho Waiter tại `/waiter/order/:tableId`, thực thi quy tắc một Active Order duy nhất trong suốt phiên ăn của bàn `OCCUPIED`, cơ chế kiểm tra tồn kho nguyên liệu tức thời theo công thức (Recipe Validation) chống âm kho, giỏ hàng dạng ngăn kéo (Order Drawer), và liên kết mượt mà với phân hệ Thanh toán RM-016.

Các mục tiêu kiến trúc cốt lõi:
1. **Giao diện Gọi món Waiter (`/waiter/order/:tableId`)**: Header điều hướng, Sidebar tích hợp Table Information Card và danh mục món mở rộng, Main grid với thanh tìm kiếm nhanh và lưới 3 Food Cards / hàng, Food Detail Modal xem chi tiết và nhập ghi chú món.
2. **Ngăn kéo Giỏ hàng (Order Drawer)**: Quản lý danh sách món đã chọn, tăng/giảm/xóa món, sửa ghi chú chế biến, hiển thị tổng tiền toàn đơn, nút `[Đặt đơn]` và `[Hủy đơn hàng]`.
3. **Quy tắc Duy nhất một Active Order & Continue Order**: Mỗi phiên ăn chỉ duy nhất một đơn `PENDING`; khi vào lại bàn có đơn `PENDING`, tự động tải lại toàn bộ đơn hiện tại để tiếp tục gọi thêm món mà không tạo đơn mới.
4. **Kiểm tra Tồn kho Tức thời (Instant Stock Validation)**: Đối chiếu tồn kho khả dụng hiện tại theo công thức món ăn (Recipe RM-007) ở cả Frontend và Backend, chặn đứng hành vi đặt món vượt tồn kho khả dụng; không khóa giữ chỗ kho cứng cho đơn `PENDING`; trừ kho vật lý FEFO diễn ra khi thanh toán (RM-016).
5. **Đồng bộ Realtime SignalR**: Phát thông báo `TableOrderUpdated` qua `TableHub` cập nhật chỉ báo `hasActiveOrder = true` trên sơ đồ bàn `/waiter/tables` tức thì trong < 1 giây.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Phiên bản**: C# 13 (.NET 10.0 SDK), TypeScript 5.x, Node.js 20.x
- **Dependencies chính**: ABP Framework 9.x, Entity Framework Core 9.x/10.x, Volo.Abp.AspNetCore.SignalR, Angular 19+ (Standalone Components, Signals, RxJS, @microsoft/signalr)
- **Lưu trữ**: Microsoft SQL Server (Code-First Migrations qua `Acme.TooHungry.DbMigrator`), EF Core DbContext
- **Kiểm thử**: xUnit, Shouldly, NSubstitute (`Acme.TooHungry.Domain.Tests`, `Acme.TooHungry.Application.Tests`)
- **Nền tảng đích**: Web application responsive (màn hình cảm ứng POS, Tablet Waiter, Desktop)
- **Loại dự án**: abp-modular / angular-spa
- **Mục tiêu hiệu suất**:
  - Tải trang Order và nạp thực đơn/bàn ăn dưới 300ms
  - Thao tác thêm/tăng món trong giỏ phản hồi dưới 50ms
  - API kiểm tra tồn kho và Submit đơn phản hồi dưới 400ms
  - Tín hiệu SignalR đồng bộ bàn tới client khác dưới 1 giây
- **Ràng buộc**:
  - Tuân thủ nghiêm ngặt Hiến pháp Acme.TooHungry (Điều I đến VIII)
  - Hệ thống nhận diện màu Cam & Trắng (Orange & White Theme) theo Hiến pháp Điều VI
  - Hỗ trợ song ngữ 100% qua `vi.json` và `en.json` (Hiến pháp Điều VII)
  - Tất cả tài liệu Markdown sử dụng Tiếng Việt (Hiến pháp Điều VIII)
- **Quy mô/Phạm vi**: Nhà hàng phục vụ hàng trăm lượt khách/ngày, thực đơn hàng trăm món, kiểm tra tồn kho công thức chính xác tuyệt đối không sai số.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi nghiên cứu và thiết kế chi tiết.*

- [x] **I. Domain-Driven Design (DDD) & Phân lớp ABP**:
  - Tầng `Domain.Shared`: `OrderStatus` enum.
  - Tầng `Domain`: Thực thể `Order`, `OrderItem`, Domain logic và repository query logic.
  - Tầng `Application.Contracts`: `OrderDto`, `OrderItemDto`, `SubmitOrderInputDto`, `ValidateOrderStockInputDto`, permissions `TooHungryPermissions.Orders`.
  - Tầng `Application`: `OrderAppService` điều phối các use cases: `GetActiveOrderByTableIdAsync`, `ValidateStockAsync`, `SubmitOrderAsync`, `CancelOrderAsync`.
  - Tầng `EntityFrameworkCore`: Mapping DbContext, cấu hình filtered unique index trên `TableId` cho đơn `Pending`.
  - Tầng `HttpApi.Host`: REST API endpoints và SignalR `TableHub`.
- [x] **II. UML & Domain Model Alignment**:
  - Nhất quán với mô hình Visual Paradigm (`RMS-TH.vpp`), quan hệ giữa `Order`, `OrderItem`, `RestaurantTable`, `Dish`, `Recipe` và `Inventory`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Kiểm thử toàn diện trong `Acme.TooHungry.Application.Tests`: Unit test cho rule Active Order duy nhất, rule kiểm tra tồn kho theo Recipe, rule tính toán tổng tiền, và kiểm tra phân quyền.
- [x] **IV. Hợp đồng API nghiêm ngặt & Tích hợp Module Angular**:
  - Dùng proxy sinh tự động (`OrderService`), kiểu dữ liệu strongly-typed, tách bạch rõ giữa `/waiter/tables`, `/waiter/order/:tableId` và `/waiter/payment/:orderId`.
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy**:
  - Kế thừa `FullAuditedAggregateRoot<Guid>` và `FullAuditedEntity<Guid>`, kiểm tra quyền qua `[Authorize(TooHungryPermissions.Orders.Default)]`.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Áp dụng nền trắng sạch bo góc, nút màu cam gradient, badge cảnh báo tinh tế.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% các chuỗi nhãn UI, thông báo lỗi, thông báo thành công đều có trong cả `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ tài liệu trong thư mục spec được viết hoàn toàn bằng Tiếng Việt.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (specs/)

```text
specs/010-rm-010-pos-ordering-and-billing/
├── spec.md                  # Đặc tả nghiệp vụ và các quyết định làm rõ (Clarifications)
├── plan.md                  # Kế hoạch kiến trúc kỹ thuật chi tiết (tệp này)
├── research.md              # Nghiên cứu giải pháp kỹ thuật, kiểm tra kho và UX
├── data-model.md            # Thiết kế mô hình dữ liệu, Enums, Entities, DTOs và Invariants
├── quickstart.md            # Hướng dẫn kiểm thử tự động và thủ công E2E
├── contracts/               # Hợp đồng giao tiếp API REST và SignalR
│   └── pos-order-api.md
└── checklists/
    └── requirements.md      # Bảng kiểm tra chất lượng đặc tả
```

### Mã nguồn Triển khai (Mã nguồn thực tế trong repo)

```text
# Backend .NET
src/Acme.TooHungry.Domain.Shared/Orders/
├── OrderStatus.cs                                  # Enum Pending, Processing, Completed, Cancelled
src/Acme.TooHungry.Domain/Orders/
├── Order.cs                                        # Aggregate Root: TableId, OrderNumber, Items, Status, TotalAmount
└── OrderItem.cs                                    # Entity: DishId, Quantity, UnitPrice, TotalPrice, Note
src/Acme.TooHungry.Application.Contracts/Orders/
├── IOrderAppService.cs                             # Interface dịch vụ ứng dụng gọi món POS
└── OrderDtos.cs                                    # OrderDto, OrderItemDto, SubmitOrderInputDto, ValidateStockDto
src/Acme.TooHungry.Application/Orders/
└── OrderAppService.cs                              # Triển khai GetActiveOrder, ValidateStock, SubmitOrder, CancelOrder
src/Acme.TooHungry.EntityFrameworkCore/
└── EntityFrameworkCore/TooHungryDbContext.cs       # Cấu hình Fluent API & Filtered Unique Index cho Active Order

# Frontend Angular
angular/src/app/
├── app.routes.ts                                   # Thêm route: { path: 'waiter/order/:tableId', component: WaiterOrderComponent }
├── proxy/orders/                                   # Proxy services và models sinh tự động
└── waiter/
    ├── tables/waiter-tables.component.ts           # Cập nhật điều hướng [Order] sang /waiter/order/:tableId
    └── order/                                      # Màn hình gọi món chuyên biệt cho Waiter
        ├── waiter-order.component.ts               # Standalone Component điều phối logic gọi món
        ├── waiter-order.component.html             # Template: Header, Sidebar Info Card, Menu Grid 3 cards, Drawer, Modal
        └── waiter-order.component.scss             # Styling chuẩn nhận diện Cam & Trắng
```

---

## Lộ trình Thực thi & Giai đoạn Triển khai

### Giai đoạn 1: Hoàn thiện Hợp đồng Backend & Kiểm thử Domain (`Backend API & Tests`)
1. Cập nhật `IOrderAppService` và `OrderAppService`:
   - Bổ sung `ValidateStockAsync(ValidateOrderStockInputDto input)`.
   - Bổ sung `SubmitOrderAsync(SubmitOrderInputDto input)`.
   - Bổ sung `CancelOrderAsync(Guid id, CancelOrderInputDto input)`.
   - Bổ sung `NotifyTableOrderUpdatedAsync` trong `ITableRealtimeNotifier` và `TableHub`.
2. Viết kiểm thử tự động trong `Acme.TooHungry.Application.Tests`:
   - `OrderAppService_SubmitOrder_Tests`: Kiểm thử tạo đơn mới, cập nhật đơn cũ, và chặn đơn rỗng.
   - `OrderAppService_ValidateStock_Tests`: Kiểm thử kiểm tra nguyên liệu tồn kho theo Recipe, chặn khi thiếu kho.
   - `OrderAppService_ActiveOrder_Tests`: Kiểm thử rule duy nhất 1 đơn PENDING cho mỗi bàn.

### Giai đoạn 2: Sinh Proxy & Cập nhật Điều hướng (`Angular Proxy & Route`)
1. Chạy `npm run generate-proxy` để đồng bộ DTO và methods mới sang Angular.
2. Thêm route `/waiter/order/:tableId` vào `app.routes.ts`.
3. Cập nhật phương thức `goToOrder(table)` trong `waiter-tables.component.ts` điều hướng chính xác sang `/waiter/order/${table.id}`.

### Giai đoạn 3: Phát triển Giao diện Waiter Order (`Angular UI Component`)
1. Xây dựng component `WaiterOrderComponent` tại `angular/src/app/waiter/order/`:
   - **Header**: Nút Back về danh sách bàn, nút giỏ hàng `[🛒]` kèm badge số lượng.
   - **Sidebar**: Table Information Card ở đầu trang (Tên bàn, Sức chứa, Badge `OCCUPIED`), bên dưới là Menu Categories mở rộng mặc định.
   - **Main Grid**: Thanh tìm kiếm nhanh + Lưới 3 Food Cards / hàng.
   - **Food Detail Modal**: Xem ảnh lớn, tên, mô tả, giá và ô nhập ghi chú món ăn.
   - **Order Drawer**: Danh sách món, tăng/giảm/xóa món, sửa ghi chú, tổng tiền, nút `[Đặt đơn]` và nút `[Hủy đơn hàng]`.
2. Áp dụng bảng màu nhận diện Cam & Trắng, chuyển động mượt mà.
3. Cập nhật từ điển song ngữ vào cả `en.json` và `vi.json`.

### Giai đoạn 4: Xác minh End-to-End & Cổng Chất lượng (`Verification & Sign-off`)
1. Chạy kiểm thử tự động toàn bộ test suite.
2. Chạy thử nghiệm thủ công theo kịch bản trong `quickstart.md`.
3. Xác nhận tính tương thích với các module hạ nguồn: Thanh toán RM-016 và Tồn kho RM-011.

---

## Theo dõi Độ phức tạp (Complexity Tracking)

*Không có vi phạm nào đối với Hiến pháp Acme.TooHungry.*
