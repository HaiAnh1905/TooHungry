# Kế hoạch Triển khai (Implementation Plan): RM-024 Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular (Angular Architecture & Performance Refactoring)

**Nhánh (Branch)**: `024-rm-024-angular-architecture-and-performance-refactoring` | **Ngày**: 2026-10-23 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/024-rm-024-angular-architecture-and-performance-refactoring/spec.md` giải quyết triệt để 24 vấn đề hiệu năng, rò rỉ bộ nhớ và tái cấu trúc kiến trúc Frontend từ `CODE_REVIEW.md`:
1. **Phân trang Đơn hàng Máy chủ & Khắc phục Route Chết**:
   - Mở rộng DTO `GetOrdersInputDto` hỗ trợ `filter` và `status` ở Backend, truyền qua `streamCreator` của `ListService` tại `order.component.ts`. Giữ nguyên `totalCount` thực từ server, xóa bỏ việc cắt mảng client.
   - Xóa bỏ tuyến đường không tồn tại `/table/layout`, chuẩn hóa điều hướng Thu ngân sang `/tables` (hoặc `/waiter/tables`).
2. **Triệt tiêu Rò rỉ Bộ nhớ & Tối ưu Change Detection**:
   - Thêm `.pipe(filter(u => !!u?.isAuthenticated), take(1))` cho subscription `currentUser` khi lắng nghe sự kiện `visibilitychange` tại `app.component.ts`.
   - Bao bọc bộ hẹn giờ 1 giây tại `sidebar-widgets.component.ts` bằng `NgZone.runOutsideAngular`; chặn interval 300ms chạy vô tận khi không tìm thấy sidebar LeptonX.
3. **Xây dựng Thành phần Dùng chung (Shared Components)**:
   - Xây dựng component phân trang standalone `<app-pager>` chuẩn nhận diện Cam & Trắng, thay thế boilerplate lặp lại ở 7 màn hình (`order`, `dish`, `dish-category`, `unit`, `ingredient`, `recipe`, `table`).
   - Xóa bỏ triệt để mã hack DOM `window.dispatchEvent(new Event('resize'))` và các timer trễ.
   - Xây dựng `TableStateService`, component thẻ bàn `<app-table-card>` và `TableStatusPipe` dùng chung giữa `/tables` và `/waiter/tables`.
4. **Tối ưu Template & Triệt tiêu Tải Dữ liệu Khổng lồ**:
   - Xóa bỏ việc tải 1000 recipes và 1000 ingredients tại `order.component.ts`, chuyển đổi hoàn toàn sang việc gọi API máy chủ `orderService.validateStock`.
   - Loại bỏ client tự gửi `unitPrice`/`totalAmount` và tự sinh mã đơn `ORD-...`.
   - Sửa thẻ `[innerHTML]` hiển thị cảnh báo sang string interpolation an toàn chống XSS.
   - Thay thế các getter template tạo mảng mới bằng Signal `computed()`; tối ưu thuật toán sắp xếp O(n^2) tại bảng kho.
5. **Chuẩn hóa Xử lý Lỗi, i18n & Tối ưu SCSS**:
   - Truyền `{ skipHandleError: true }` khi component tự bắt lỗi để chặn hiển thị đồng thời cả modal ABP và toast component.
   - Chuyển đổi 100% chuỗi hardcode tiếng Việt sang từ điển đa ngôn ngữ trong `vi.json` và `en.json`.
   - Đổi ngôn ngữ trong `waiter-layout` mượt mà qua ABP `sessionState`, loại bỏ `window.location.reload()`, dùng pipe `currency:'VND'`.
   - Định dạng ngày tháng an toàn theo múi giờ địa phương, không dùng `toISOString().split('T')[0]`.
   - Tối ưu `table.component.scss` (giảm từ 100KB xuống dưới 30KB) và dọn dẹp các chỉ thị `!important`.
   - Di dời các hàm tùy biến proxy ra ngoài thư mục `proxy/` để bảo vệ mã nguồn khi chạy `abp generate-proxy`.

---

## Tóm tắt (Summary)

Kế hoạch triển khai **RM-024: Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular** thực hiện tái cấu trúc toàn diện tầng giao diện người dùng của ứng dụng `Acme.TooHungry`. Bằng việc giải quyết triệt để 24 vấn đề phát hiện từ `CODE_REVIEW.md`, gói nâng cấp này triệt tiêu rò rỉ bộ nhớ, tối ưu hóa vòng lặp Change Detection, loại bỏ các đoạn mã hack DOM, giảm tải mạng, đồng bộ trải nghiệm phân trang với component `<app-pager>` chuẩn Cam & Trắng, và chuẩn hóa quốc tế hóa (i18n) mượt mà.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: TypeScript 5.x, Angular 18+, SCSS, RxJS 7.x, ABP Framework Angular 9.x
- **Backend Hỗ trợ**: .NET 10.0, C# 13, ABP Framework 9.x (`IOrderAppService`, `OrderAppService`)
- **Kiến trúc Trạng thái**: Angular Signals (`signal`, `computed`), ABP `ListService`, RxJS Declarative Operators
- **Giao tiếp Realtime**: Microsoft SignalR Core (`TableSignalrService`)
- **Design System**: Bộ nhận diện Cam & Trắng đặc trưng của dự án Acme.TooHungry
- **Kiểm thử**: xUnit, Shouldly cho Backend; Vitest / Karma cho Frontend; kiểm tra biên dịch tĩnh `ng build`
- **Ràng buộc Kỹ thuật**:
  - Không phá vỡ các chức năng nghiệp vụ đang chạy.
  - 100% chuỗi giao diện được khai báo trong `vi.json` và `en.json`.
  - Không được can thiệp code tùy biến vào các file trong `proxy/`.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp ABP**:
  - Logic phân trang và kiểm tra tồn kho được hỗ trợ tập trung ở tầng Application/Domain của Backend; tầng Frontend chỉ đóng vai trò hiển thị và điều phối trạng thái giao diện.
- [x] **II. UML & Domain Model Alignment**:
  - Mô hình trạng thái bàn, đơn hàng và kho giữ nguyên sự đồng nhất tuyệt đối với mô hình kiến trúc `RMS-TH.vpp`.
- [x] **III. Test-First & Cổng chất lượng tự động**:
  - Đảm bảo 100% Backend Unit Tests PASS và Frontend Angular biên dịch sạch (`npm run build` thành công không cảnh báo lỗi).
- [x] **IV. Hợp đồng API nghiêm ngặt**:
  - DTO `GetOrdersInputDto` được định kiểu mạnh, tuân thủ hợp đồng chi tiết tại `contracts/frontend-refactoring-contracts.md`.
- [x] **V. Bảo mật & Thẩm quyền**:
  - Triệt tiêu lỗ hổng XSS tiềm ẩn trong `order.component.html`; loại bỏ việc client gửi giá bán `unitPrice`; bảo vệ các nút thao tác bằng `*abpPermission`.
- [x] **VI. Sự nhất quán UI/UX (Theme Cam & Trắng)**:
  - Component `<app-pager>` và `<app-table-card>` được thiết kế đồng bộ với hệ thống nhận diện Cam & Trắng (nút bo tròn 8px, màu active `#EA580C`, nền cam nhạt `#FFF3E8`).
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% chuỗi giao diện và thông báo phản hồi được bổ sung đồng bộ trong cả hai tệp `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ tài liệu được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (`specs/024-rm-024-angular-architecture-and-performance-refactoring/`)
```text
specs/024-rm-024-angular-architecture-and-performance-refactoring/
├── spec.md                                 # Đặc tả nghiệp vụ và biên bản phiên làm rõ
├── plan.md                                 # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                             # Kết quả nghiên cứu 8 giải pháp kỹ thuật Phase 0
├── data-model.md                           # Mô hình DTO, Pager, Table State, Business Hours, i18n
├── quickstart.md                           # Hướng dẫn kiểm định 5 kịch bản thực tế & lệnh test
├── contracts/
│   └── frontend-refactoring-contracts.md   # Hợp đồng API, Component Inputs/Outputs, Service Interfaces
└── checklists/
    └── requirements.md                     # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Triển khai & Tái cấu trúc
```text
# 1. Backend Coordination (Hỗ trợ phân trang Đơn hàng)
src/Acme.TooHungry.Application.Contracts/
└── Orders/
    ├── OrderDtos.cs                        # Bổ sung GetOrdersInputDto (Filter, Status)
    └── IOrderAppService.cs                 # Cập nhật GetListAsync nhận GetOrdersInputDto

src/Acme.TooHungry.Application/
└── Orders/
    └── OrderAppService.cs                  # Áp dụng Filter & Status trong truy vấn GetListAsync

# 2. Frontend Shared Components & Services
angular/src/app/shared/
├── components/
│   ├── pager/
│   │   ├── pager.component.ts              # Component phân trang dùng chung Cam & Trắng
│   │   ├── pager.component.html
│   │   └── pager.component.scss
│   └── tables/
│       └── table-card/
│           ├── table-card.component.ts     # Component thẻ bàn dùng chung cho Admin & Waiter
│           ├── table-card.component.html
│           └── table-card.component.scss
├── services/
│   ├── table-state.service.ts              # Quản lý trạng thái bàn & Realtime SignalR tập trung
│   ├── extended-ingredient.service.ts      # Di dời các hàm tùy biến ra khỏi proxy/
│   └── user-role-navigation.service.ts     # Xóa route chết /table/layout -> /tables
├── pipes/
│   └── table-status.pipe.ts                # Pipe nhãn & màu trạng thái bàn ăn
└── constants/
    └── business-hours.constant.ts          # Khung giờ mở cửa nhà hàng tập trung (9h - 23h)

# 3. Frontend Component Refactoring
angular/src/app/
├── app.component.ts                        # take(1) cho visibilitychange, xóa route /table/layout
├── app.routes.ts                           # Bảo đảm route tables và wildcard ** 404
├── sidebar-widgets/
│   └── sidebar-widgets.component.ts        # NgZone.runOutsideAngular, dừng interval 300ms sau 10 lần
├── order/
│   ├── order.component.ts                  # Server paging, bỏ tải 1000 items, dùng validateStock, bỏ random code
│   └── order.component.html                # Dùng <app-pager>, string interpolation chống XSS
├── table/
│   ├── table.component.ts                  # Tích hợp TableStateService, <app-pager>, <app-table-card>
│   ├── table.component.html
│   └── table.component.scss                # Tái cấu trúc, giảm dung lượng từ 100KB -> < 30KB
├── waiter/
│   ├── tables/
│   │   ├── waiter-tables.component.ts      # Tích hợp TableStateService, <app-table-card>
│   │   └── waiter-tables.component.html
│   └── layout/
│       └── waiter-layout.component.ts      # Đổi ngôn ngữ không reload trang, pipe currency:'VND'
├── dish/dish.component.html                # Tích hợp <app-pager>, bỏ hack resize
├── dish-category/dish-category.component.html # Tích hợp <app-pager>, bỏ hack resize
├── unit/unit.component.html                # Tích hợp <app-pager>, bỏ hack resize
├── ingredient/ingredient.component.html    # Tích hợp <app-pager>, bỏ hack resize
├── recipe/recipe.component.html            # Tích hợp <app-pager>, bỏ hack resize
└── assets/i18n/ (và Domain.Shared)
    ├── vi.json                             # Bổ sung 15 khóa ngôn ngữ Tiếng Việt mới
    └── en.json                             # Bổ sung 15 khóa ngôn ngữ Tiếng Anh tương ứng
```

---

## Các Giai đoạn Thực thi Chi tiết (Implementation Phases)

### Giai đoạn 1: Nền tảng Backend DTO & Hằng số Dùng chung
- Bổ sung `GetOrdersInputDto` trong `OrderDtos.cs` và cập nhật `IOrderAppService.cs` / `OrderAppService.cs`.
- Tạo `shared/constants/business-hours.constant.ts` và thay thế giá trị hardcode 9-23 ở 4 màn hình.
- Bổ sung toàn bộ các khóa ngôn ngữ mới vào `vi.json` và `en.json` (cả ở `Domain.Shared` và `angular/src/assets/i18n`).

### Giai đoạn 2: Khắc phục Triệt để Memory Leaks, NgZone & Điều hướng Tuyến đường
- Tối ưu `app.component.ts`: Thêm `take(1)` cho subscription `currentUser` trong `visibilitychange`; xóa bỏ tuyến đường chết `/table/layout`.
- Sửa `user-role-navigation.service.ts` và `dashboard.guard.ts`: Phân luồng động tuyến đường Thu ngân theo quyền hạn (vào `/tables` nếu có quyền quản trị/tạo bàn, nếu chỉ có quyền phục vụ thì vào `/waiter/tables`).
- Tối ưu `sidebar-widgets.component.ts`: Bao bọc timer 1s bằng `NgZone.runOutsideAngular` và thêm điều kiện dừng giới hạn 10 lần cho interval thăm dò DOM 300ms.

### Giai đoạn 3: Xây dựng & Tích hợp Component Phân trang Dùng chung `<app-pager>`
- Tạo component `<app-pager>` tại `shared/components/pager/` tuân thủ nhận diện Cam & Trắng, hỗ trợ cả Two-Way Binding `[(page)]`/`[(pageSize)]` lẫn ABP `ListService` Adapter cho cả Table và Grid Card.
- Tích hợp `<app-pager>` vào 7 màn hình: `order`, `dish`, `dish-category`, `unit`, `ingredient`, `recipe`, `table`.
- Loại bỏ toàn bộ các đoạn mã hack `window.dispatchEvent(new Event('resize'))` và các timer 50ms/200ms trong `recalculateTable()`.

### Giai đoạn 4: Tái cấu trúc Màn hình Quản lý Đơn hàng (`order.component.ts`)
- Triệt tiêu việc cắt mảng client, chuyển hoàn toàn việc lọc `filter` và `status` sang `streamCreator` của ABP `ListService`.
- Xóa bỏ hàm `loadRecipesAndIngredients()` tải 1000 recipes và 1000 ingredients; thay bằng API máy chủ `orderService.validateStock` với cơ chế kiểm tra Realtime có Debounce 300ms khi chỉnh giỏ hàng và kiểm tra chốt chặn lần cuối khi bấm Lưu đơn.
- Loại bỏ client tự sinh mã đơn `ORD-...` và loại bỏ gửi `unitPrice` lên server.
- Thay thế `[innerHTML]` bằng string interpolation `{{ warning }}` chống XSS trong `order.component.html`.
- Thêm `{ skipHandleError: true }` khi lưu đơn hàng để tránh hiện đồng thời 2 thông báo lỗi.

### Giai đoạn 5: Tái cấu trúc Quản lý Bàn: `TableStateService` & `<app-table-card>` & SCSS
- Xây dựng `TableStateService` và `TableStatusPipe`.
- Xây dựng component dùng chung `<app-table-card>` và tích hợp vào cả `/tables` và `/waiter/tables`.
- Tách module SCSS: Chuyển CSS thẻ bàn vào `<app-table-card>`, CSS modal vào các modal con, giữ lại stylesheet layout chính với dung lượng < 25KB và dọn dẹp triệt để các chỉ thị `!important`.

### Giai đoạn 6: Chuẩn hóa Trải nghiệm Ngôn ngữ, RxJS & Bảo vệ Proxy
- Tối ưu `waiter-layout.component.ts`: Loại bỏ `window.location.reload()`, dùng `sessionState.setLanguage(...)`, dùng pipe `currency:'VND'`.
- Khử lồng nhau (flattening) các subscription 3 tầng tại `waiter-tables.ts` và `inventory.ts`.
- Tạo `ExtendedIngredientService` tại `shared/services/` và khôi phục `proxy/` về trạng thái nguyên bản của ABP.
- Kiểm định toàn diện qua các bài test tự động và build sạch dự án (`dotnet test`, `npm run build`).
