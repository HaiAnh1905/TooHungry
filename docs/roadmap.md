# Roadmap Build — Acme.TooHungry (Restaurant Management)

**Mục tiêu**: thứ tự build/hoàn thiện từng màn/chức năng.
**Cập nhật**: 2026-10-19
**Trạng thái item**: `chưa` (mặc định) / `đang` / `xong`.

> **Nguồn liệt-kê-được**: File Entities trong thư mục `src/Acme.TooHungry.Domain` kết hợp với thư mục `specs`.
> Đơn vị "màn/chức năng" = Quản lý (CRUD) một Entity hoặc một chức năng dùng chung.
> Tổng 19 item sau khi gộp và ánh xạ với các đặc tả hiện có (từ RM-001 đến RM-019; bổ sung RM-017 Làm lại trang quản lý bàn, RM-018 Làm mới trang Dashboard, RM-019 Trang báo lỗi hệ thống và điều hướng phục hồi).
>
> **Chiến lược đã chốt (interview 2026-10-06 & cập nhật 2026-10-08)**:
> 1. **Granularity**: 1 màn cho 1 Entity hoặc cụm tính năng liên quan chặt chẽ.
> 2. **Wave 0 = foundation**: Auth, Shared UI, Identity, chặn mọi màn sau.
> 3. **Ưu tiên**: Master Data (Units, Ingredients, Dishes) lên trước, các nghiệp vụ vận hành (Orders, Inventory) để Wave sau cùng.
> 4. **Đánh số ID**: Cấp mới từ RM-001; sau khi loại bỏ RM-010 Thực đơn trong ngày, thực hiện đôn số tuần tự dịch trái (Shift left) từ RM-010 đến RM-016 (RM-010 POS, RM-011..013 Kho, RM-014 Dự báo, RM-015 Bố cục Waiter, RM-016 Thanh toán).
> 5. Giữ 1 item cho CRUD của cùng 1 Entity. Khu vực & Bàn ăn gộp chung thành RM-008 do dùng chung spec.
> 6. **Chuỗi tuần tự vận hành Waiter (Dependency Flow)**:
>    `Authentication (RM-001) → Waiter Routing & Layout (RM-015) → Table Management (RM-008) → Booking (RM-009) → Customer Check-in (RM-008: AVAILABLE → OCCUPIED) → Order (RM-010) → Payment (RM-016) → Cleaning (RM-008: CLEANING) → Table Available (RM-008: AVAILABLE)`
> 7. **Chu kỳ trạng thái bàn (Table State Flow)**:
>    ```text
>    AVAILABLE
>       │
>       ├── Đón khách ───────────────→ OCCUPIED
>       │
>       ├── Đặt bàn → RESERVED
>       │                 │
>       │                 ├── Đón khách → OCCUPIED
>       │                 ├── Hủy → AVAILABLE
>       │                 └── Timeout 1h → AVAILABLE
>       │
>       └── Vô hiệu → INACTIVE
>                             │
>                             └── Kích hoạt → AVAILABLE
>
>    OCCUPIED
>       │
>       ├── Không Order
>       │      └── Kết thúc → AVAILABLE
>       │
>       └── Có Order
>              └── Payment
>                    │
>                    └── Paid → CLEANING
>                                  │
>                                  └── Dọn xong → AVAILABLE
>    ```
>
> **Hạng mục NGOÀI nguồn** (tồn tại trong code/tài liệu nhưng **không tạo item riêng**, parked):
> - Settings, Data, OpenIddict — phụ trợ hệ thống, không làm màn hình riêng hoặc gộp vào Identity.
> - DailyMenus — thực đơn theo ngày (loại khỏi roadmap do gọi món POS lấy trực tiếp từ Master Data món ăn RM-006).
>
> **Cột `Spec`** = thư mục đặc tả SỞ HỮU item trong `specs/`, `—` = chưa có. Hiện **19/19 item có spec (100% độ phủ)**.

## Bảng tổng (thứ tự build)

| ID | Màn | Module | Wave | Phụ thuộc | Spec | Trạng thái |
|----|-----|--------|------|-----------|------|------------|
| RM-001 | Đăng nhập | auth | 0 | N/A | [001-rm-001-login](../specs/001-rm-001-login/spec.md) | xong |
| RM-002 | Shared UI / design system | shared | 0 | N/A | [002-rm-002-shared-ui](../specs/002-rm-002-shared-ui/spec.md) | xong |
| RM-003 | Quản lý Người dùng & Phân quyền | identity | 0 | RM-001, RM-002 | [003-rm-003-identity](../specs/003-rm-003-identity/spec.md) | xong |
| RM-004 | Quản lý Đơn vị tính (Units) | masterdata | 1 | RM-002 | [004-rm-004-units](../specs/004-rm-004-units/spec.md) | xong |
| RM-005 | Quản lý Nguyên liệu (Ingredients) | masterdata | 1 | RM-004 | [005-rm-005-ingredients](../specs/005-rm-005-ingredients/spec.md) | xong |
| RM-006 | Quản lý Món ăn & Danh mục (Dishes) | masterdata | 1 | RM-002 | [006-rm-006-dishes-and-dish-categories](../specs/006-rm-006-dishes-and-dish-categories/spec.md) | xong |
| RM-007 | Quản lý Công thức (Recipes) | masterdata | 1 | RM-005, RM-006 | [007-rm-007-recipe-inventory-consumption](../specs/007-rm-007-recipe-inventory-consumption/spec.md) | xong |
| RM-008 | Quản lý Khu vực & Bàn ăn (Table Management) | setup | 2 | RM-002, RM-015 | [008-rm-008-dining-areas-and-tables](../specs/008-rm-008-dining-areas-and-tables/spec.md) | xong |
| RM-009 | Đặt bàn (Table Reservation) | setup | 2 | RM-008 | [009-rm-009-table-reservation](../specs/009-rm-009-table-reservation/spec.md) | xong |
| RM-010 | POS / Đơn hàng (Orders) | operations | 3 | RM-006, RM-008, RM-015 | [010-rm-010-pos-ordering-and-billing](../specs/010-rm-010-pos-ordering-and-billing/spec.md) | xong |
| RM-011 | Quản lý Tồn kho & Giao dịch | operations | 3 | RM-005 | [011-rm-011-inventory-transactions](../specs/011-rm-011-inventory-transactions/spec.md) | xong |
| RM-012 | Giao diện Tồn kho (UI Redesign) | operations | 3 | RM-011 | [012-rm-012-inventory-ui-redesign](../specs/012-rm-012-inventory-ui-redesign/spec.md) | xong |
| RM-013 | Tồn kho - Khóa/Khôi phục | operations | 3 | RM-011 | [013-rm-013-inventory-deactivate-restore](../specs/013-rm-013-inventory-deactivate-restore/spec.md) | xong |
| RM-014 | Dự báo (Forecasts) | operations | 4 | RM-010, RM-011, RM-016 | [014-rm-014-forecasts](../specs/014-rm-014-forecasts/spec.md) | xong |
| RM-015 | Điều hướng & Bố cục Waiter (Waiter Routing & Layout) | waiter | 2 | RM-001, RM-002, RM-003 | [015-rm-015-waiter-routing-and-layout](../specs/015-rm-015-waiter-routing-and-layout/spec.md) | xong |
| RM-016 | Thanh toán đơn hàng (Payment Page) | operations | 3 | RM-010 | [016-rm-016-payment-page](../specs/016-rm-016-payment-page/spec.md) | xong |
| RM-017 | Làm lại trang Quản lý bàn (Table Management Redesign) | setup | 2 | RM-008, RM-015 | [017-rm-017-table-management-redesign](../specs/017-rm-017-table-management-redesign/spec.md) | xong |
| RM-018 | Làm mới trang Dashboard (Dashboard Redesign) | dashboard | 4 | RM-002, RM-006, RM-008, RM-010, RM-011 | [018-rm-018-dashboard-redesign](../specs/018-rm-018-dashboard-redesign/spec.md) | xong |
| RM-019 | Trang báo lỗi & Phục hồi điều hướng (404, 403, 500/505) | shared | 4 | RM-001, RM-002, RM-003, RM-015 | [019-rm-019-error-pages-and-recovery](../specs/019-rm-019-error-pages-and-recovery/spec.md) | xong |

## Chi tiết

### RM-001 — Đăng nhập (auth, Wave 0)
- **Mô tả**: Màn hình đăng nhập hệ thống dành cho nhân viên / quản lý.
- **Nguồn**: `src/Acme.TooHungry.Domain/Identity`
- **Thực thể/CRUD**: User — Đăng nhập.
- **Backend**: Đã có module Identity của ABP.
- **Phụ thuộc**: N/A
- **Spec**: `specs/001-rm-001-login/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-002 — Shared UI / design system (shared, Wave 0)
- **Mô tả**: Xây dựng các component UI cơ bản (table, form, modal) và cấu trúc layout hệ thống.
- **Nguồn**: Angular UI.
- **Thực thể/CRUD**: N/A
- **Backend**: N/A
- **Phụ thuộc**: N/A
- **Spec**: `specs/002-rm-002-shared-ui/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-003 — Quản lý Người dùng & Phân quyền (identity, Wave 0)
- **Mô tả**: Quản lý danh sách nhân viên, tài khoản và phân quyền vào các module nghiệp vụ.
- **Nguồn**: `src/Acme.TooHungry.Domain/Identity`
- **Thực thể/CRUD**: IdentityUser, IdentityRole — list, tạo, sửa, xoá, phân quyền.
- **Backend**: Đã có sẵn của ABP Framework.
- **Phụ thuộc**: RM-001, RM-002
- **Spec**: `specs/003-rm-003-identity/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-004 — Quản lý Đơn vị tính (masterdata, Wave 1)
- **Mô tả**: Danh mục đơn vị tính sử dụng cho nguyên liệu (kg, lit, gói, hộp...).
- **Nguồn**: `src/Acme.TooHungry.Domain/Units`
- **Thực thể/CRUD**: Unit — list, tạo, sửa, xoá.
- **Backend**: Đã có Entity, UnitManager, UnitAppService và API cơ bản trong Domain & Application.
- **Phụ thuộc**: RM-002
- **Spec**: `specs/004-rm-004-units/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-005 — Quản lý Nguyên liệu (masterdata, Wave 1)
- **Mô tả**: Danh sách nguyên liệu dùng để chế biến, lưu kho.
- **Nguồn**: `src/Acme.TooHungry.Domain/Ingredients`
- **Thực thể/CRUD**: Ingredient — list, tạo, sửa, xoá, tạm ngưng, kích hoạt lại, khôi phục thông minh.
- **Backend**: Đã hoàn thiện toàn diện: Bổ sung thuộc tính `EstimatedPrice` (độ chính xác 18, 2) trên `Ingredient` và DbContext kèm EF Core migration; xây dựng Domain Service `IngredientManager` (chuẩn hóa tên, chống trùng lặp không phân biệt hoa thường, Smart Restore khi trùng tên với bản ghi tạm ngưng, khóa đổi đơn vị tính khi có liên kết `RecipeIngredient`/`InventoryBatch`, kiểm tra xóa an toàn); nâng cấp `IngredientAppService` (tính tồn an toàn `CurrentStock` loại trừ lô quá hạn, `ExpiredStock`, CRUD, Tạm ngưng/Kích hoạt lại); `IngredientController` phân quyền hạt nhân (`TooHungryPermissions.Ingredients.*`).
- **Frontend**: Hoàn thiện màn hình Master Data độc lập `/ingredients` sử dụng `SharedTable`, `SharedModal`, bộ lọc đa tiêu chí (từ khóa, trạng thái, loại bảo quản, sắp xếp), cảnh báo tồn kho và quá hạn, modal CRUD + Tạm ngưng (bắt buộc lý do) + Khôi phục thông minh (Smart Restore).
- **Kiểm thử**: Đạt 100% kiểm thử tự động (12/12 tests PASS) gồm `IngredientManager_Tests`, `EfCoreIngredientDomainTests`, `IngredientAppService_Tests`.
- **Đa ngôn ngữ**: 100% song ngữ Tiếng Việt & Tiếng Anh (`vi.json`, `en.json`).
- **Phụ thuộc**: RM-004
- **Spec**: `specs/005-rm-005-ingredients/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-006 — Quản lý Món ăn & Danh mục (masterdata, Wave 1)
- **Mô tả**: Danh sách các món ăn bán trong nhà hàng, hình ảnh, giá bán, danh mục món.
- **Nguồn**: `src/Acme.TooHungry.Domain/Dishes`
- **Thực thể/CRUD**: Dish, DishCategory — list, tạo, sửa, xoá.
- **Backend**: Đã có Entity (`Dish`, `DishCategory`), Domain Services (`DishManager`, `DishCategoryManager`), Application Services (`DishAppService`, `DishCategoryAppService`), Controller (`DishController`) và Unit Tests (`DishAppService_Tests`, `DishCategoryAppService_Tests`).
- **Phụ thuộc**: RM-002
- **Spec**: `specs/006-rm-006-dishes-and-dish-categories/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-007 — Quản lý Công thức (masterdata, Wave 1)
- **Mô tả**: Định lượng nguyên liệu cho từng món ăn, quy đổi về đơn vị chuẩn kho `BaseUnit`, tự động tăng phiên bản `Version`, ước tính giá vốn lý thuyết & tỷ lệ Food Cost %, vòng đời tạm ngưng có lý do và kích hoạt lại an toàn.
- **Nguồn**: `src/Acme.TooHungry.Domain/Recipes`
- **Thực thể/CRUD**: Recipe, RecipeIngredient — list, tạo, sửa, xoá, tạm ngưng, kích hoạt lại, xem lịch sử phiên bản, hợp đồng tiêu hao POS & FEFO.
- **Backend**: Hoàn tất toàn diện:
  - Aggregate Root `Recipe` & Entity `RecipeIngredient` bổ sung `RecipeUnitId` (RM-004), `ConversionFactor` (18, 6), `DeactivationReason` (512), index tối ưu `(DishId, IsActive)`.
  - Domain Service `RecipeManager`: Chống trùng active recipe cho cùng 1 món, gộp trùng nguyên liệu đầu vào, bắt buộc lý do khi tạm ngưng, kiểm tra hợp lệ khi kích hoạt lại.
  - Application Service `RecipeAppService`: Phân trang, lọc đa chiều theo danh mục món, tính toán Food Cost % và cảnh báo nguyên liệu tạm ngưng `HasDeactivatedIngredients`, hỗ trợ hợp đồng `GetActiveByDishIdAsync` và tra cứu lịch sử `GetHistoryByDishIdAsync`.
  - HTTP Controller `RecipeController`: Đầy đủ endpoints CRUD, deactivate/reactivate, phân quyền ABP `TooHungryPermissions.Recipes.*`.
- **Frontend**: Màn hình quản lý `/recipes` và Modal công thức linh hoạt:
  - Bảng dữ liệu `SharedTable` hiển thị trạng thái công thức, số lượng nguyên liệu, phiên bản, giá vốn và tỷ lệ Food Cost %.
  - Bộ lọc theo danh mục món ăn và tab trạng thái (Tất cả / Đã có công thức / Chưa có công thức).
  - Modal công thức (`RecipeModalComponent`) hỗ trợ chọn nguyên liệu, đơn vị RM-004, tự động hiển thị đơn vị chuẩn kho, tính toán Food Cost % trực quan (xanh/cam/đỏ).
  - Tích hợp 2 điểm vào: truy cập từ menu chính và nút thao tác nhanh `[Công thức]` trên bảng món ăn `/dishes`.
- **Kiểm thử**: Đạt 100% kiểm thử tự động (15/15 tests Recipe PASS, 73/73 tests toàn solution PASS).
- **Đa ngôn ngữ**: 100% song ngữ Tiếng Việt & Tiếng Anh (`vi.json`, `en.json`).
- **Phụ thuộc**: RM-005, RM-006
- **Spec**: `specs/007-rm-007-recipe-inventory-consumption/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-008 — Quản lý Khu vực & Bàn ăn (setup, Wave 2)
- **Mô tả**: Quản lý sơ đồ khu vực & bàn ăn của nhà hàng, đồng thời cung cấp giao diện vận hành bàn chuyên biệt cho Waiter (`/waiter/tables`).
  - **Giao diện Danh sách bàn cho Waiter**:
    - Hiển thị danh sách bàn dạng Card/Grid, chuẩn 4 Table Cards trên mỗi hàng.
    - Mỗi Table Card hiển thị: Tên bàn, Số lượng chỗ ngồi (Capacity), Trạng thái hiện tại (Status badge), và các nút Hành động (Action buttons) tương ứng.
    - Hỗ trợ đầy đủ 5 trạng thái bàn: `AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLEANING`, `INACTIVE`.
  - **Quy tắc chuyển trạng thái & hành động**:
    - `AVAILABLE` (Badge xanh lá `[Còn trống]`):
      + `[Đón khách]`: Chuyển tức thì `AVAILABLE → OCCUPIED`. Không mở Modal nhập thông tin; khách có thể vào bàn nhưng chưa gọi món (`OCCUPIED + No Order` là trạng thái hợp lệ).
      + `[Đặt bàn]`: Mở Modal đặt bàn (chi tiết tại RM-009).
      + `[Vô hiệu hóa bàn]`: Chuyển `AVAILABLE → INACTIVE`.
    - `INACTIVE` (Badge xám / vô hiệu hóa): Waiter và Manager có quyền thực hiện. Chặn toàn bộ hành vi Đặt bàn, Đón khách, Tạo Order. Action: `[Kích hoạt bàn]` để chuyển `INACTIVE → AVAILABLE`.
    - `OCCUPIED` (Badge đỏ nhạt `[Đang có khách]`):
      + Action `[Order]`: Điều hướng sang trang gọi món `/waiter/order/:tableId` (chi tiết tại RM-010).
      + Action `[Kết thúc bữa ăn]` (Finish Meal):
        * *Case 1 (Không có Order)*: Hiển thị dialog xác nhận: *"Khách không sử dụng món ăn. Bạn có chắc chắn muốn chuyển bàn về trạng thái trống?"* → Xác nhận: Chuyển `OCCUPIED → AVAILABLE`.
        * *Case 2 (Có Order)*: Hiển thị dialog xác nhận kết thúc bữa ăn → Xác nhận: Điều hướng sang màn hình Thanh toán (RM-016).
    - `CLEANING` (Badge màu trắng/light `[Đang dọn dẹp]`): Xuất hiện sau khi hoàn tất thanh toán từ RM-016.
      + Action `[Dọn dẹp xong]`: Chuyển `CLEANING → AVAILABLE`, khôi phục các action ban đầu của bàn trống.
- **Nguồn**: `src/Acme.TooHungry.Domain/DiningAreas`, `src/Acme.TooHungry.Domain/Tables`, Angular UI (`/waiter/tables`)
- **Thực thể/CRUD**: DiningArea, RestaurantTable — list, tạo, sửa, xoá, cập nhật trạng thái bàn.
- **Backend**: Cần tạo/bổ sung API quản lý sơ đồ bàn và cập nhật trạng thái thời gian thực (`UpdateTableStatusAsync`).
- **Phụ thuộc**: RM-002, RM-015
- **Spec**: `specs/008-rm-008-dining-areas-and-tables/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-009 — Đặt bàn (Table Reservation) (setup, Wave 2)
- **Mô tả**: Tính năng đặt bàn trước cho khách hàng, tích hợp trực tiếp trên giao diện vận hành của Waiter.
  - **Tạo Booking từ bàn trống**:
    - Khi Waiter nhấn `[Đặt bàn]` từ bàn `AVAILABLE` → mở Booking Modal.
    - Trường dữ liệu: Tên khách (bắt buộc), Số điện thoại (bắt buộc), Ngày giờ nhận bàn (bắt buộc), Số lượng khách (bắt buộc, mặc định = số chỗ của bàn, chặn không cho vượt quá sức chứa bàn), Ghi chú (tùy chọn).
  - **Business Rule — Giờ đặt bàn**:
    - Nhà hàng chỉ hoạt động trong khung giờ: `09:00 → 23:00`.
    - Chặn hoàn toàn việc tạo booking ngoài giờ hoạt động (Ví dụ: 08:59 không hợp lệ, 09:00 hợp lệ, 22:59 hợp lệ, 23:00 & 23:01 không hợp lệ).
    - Validate bắt buộc ở cả Frontend và Backend.
  - **Trạng thái RESERVED**:
    - Xác nhận booking thành công: `AVAILABLE → RESERVED`.
    - Card bàn chuyển sang màu warning; vùng trạng thái hiển thị rõ: Tên khách và Số điện thoại.
    - Actions khả dụng: `[Đón khách]` (chuyển sang `OCCUPIED`), `[Hủy đặt bàn]`, `[Vô hiệu hóa bàn]`.
  - **Xem & Chỉnh sửa Booking (Booking Detail / Edit)**:
    - Click vào bàn đang `RESERVED` → mở Modal hiển thị thông tin booking.
    - Cho phép xem/cập nhật: Tên khách, SĐT, Thời gian nhận bàn, Số lượng khách, Ghi chú (bắt buộc thỏa mãn toàn bộ validation về khung giờ và sức chứa).
  - **Hủy Booking thủ công**:
    - Waiter nhấn `[Hủy đặt bàn]` → hiển thị dialog xác nhận.
    - Xác nhận thành công: Chuyển `RESERVED → AVAILABLE`.
    - Lưu lịch sử đơn đặt bàn với trạng thái `CANCELLED` (không xóa dữ liệu).
  - **Tự động hủy Booking quá hạn (Auto Cancel Booking)**:
    - Cơ chế Backend Server-side (Background Worker / Quartz.NET job), hoạt động độc lập không phụ thuộc vào việc Waiter có mở trang hay không.
    - Nếu khách không đến nhận bàn trong vòng 1 giờ kể từ thời gian nhận bàn dự kiến: Tự động chuyển booking sang `AUTO_CANCELLED` và chuyển bàn `RESERVED → AVAILABLE` (Ví dụ: đặt 18:00, chờ đến 19:00 chưa nhận bàn → tự động hủy).
- **Nguồn**: `src/Acme.TooHungry.Domain/Tables` (Reservation info trong `RestaurantTable`), Angular Booking Modal
- **Thực thể/CRUD**: TableReservation / RestaurantTable (ReservedCustomerName, ReservedPhone, ReservedTime...) — list, tạo, sửa, huỷ, auto-cancel.
- **Backend**: Cần tạo API Booking, validator giờ mở cửa, và Background Worker xử lý Auto-cancel 1h.
- **Phụ thuộc**: RM-008
- **Spec**: `specs/009-rm-009-table-reservation/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-010 — POS / Đơn hàng (operations, Wave 3)
- **Mô tả**: Quản lý đơn hàng, gọi món tại bàn cho Waiter và quy trình phục vụ bữa ăn.
  - **Điều hướng & Giao diện gọi món cho Waiter**:
    - Khi Waiter nhấn `[Order]` từ bàn `OCCUPIED` → điều hướng đến `/waiter/order/:tableId`.
    - **Sidebar**: Tự động thay đổi bộ lọc theo danh mục món ăn (Menu Categories, mặc định ở trạng thái mở rộng / Expanded). Ở đầu Sidebar bắt buộc có **Table Information Card** (Tên bàn, Số chỗ ngồi, Trạng thái hiện tại) giúp Waiter định vị chính xác bàn đang thao tác.
    - **Header trang Order**:
      + Nút `[← Back]`: Quay lại danh sách bàn `/waiter/tables`.
      + Nút `[🛒]`: Mở Order Drawer từ mép phải màn hình.
  - **Thực đơn & Thẻ món ăn (Food Card & Menu Page)**:
    - Bố cục lưới: 3 Food Cards trên mỗi hàng.
    - Mỗi Food Card gồm: Ảnh món ăn (ảnh vuông, nền đen), Tên món, Giá bán, và Nút đặt món nằm ở góc trên bên phải ảnh.
    - **Food Detail Modal**: Khi nhấn vào món ăn → mở Modal chi tiết gồm: Tên món, Mô tả, Giá, Ảnh, nút đóng `[X]` và nút `[Đặt món]`.
  - **Giỏ hàng (Order Drawer)**:
    - Nhấn biểu tượng `[🛒]` mở Drawer từ bên phải.
    - Hiển thị danh sách món ăn đã chọn: Tên món, Số lượng, Đơn giá, Thành tiền và Tổng tiền toàn đơn.
    - Cho phép thao tác trực tiếp: Tăng số lượng, Giảm số lượng, Xóa món khỏi giỏ.
  - **Quy tắc Active Order & Phiên ăn**:
    - Mỗi phiên ăn của một bàn chỉ tồn tại **duy nhất một đơn hàng hoạt động** (`Active Order`).
    - Tuyệt đối không tạo nhiều Order cho cùng một phiên ăn (Ví dụ: Bàn 05 có Order #001, khi gọi thêm món vẫn cập nhật vào Order #001, không sinh Order #002).
    - **Tiếp tục gọi món (Continue Order)**: Nếu bàn `OCCUPIED` có đơn hàng `PENDING`, Waiter truy cập lại Order Page sẽ tải lại toàn bộ đơn này để tiếp tục thêm/bớt món mà không tạo Order mới.
  - **Trạng thái đơn hàng `PENDING`**:
    - Trong module này, `PENDING` được định nghĩa là **Order chưa được thanh toán** (không hiểu là chưa gửi bếp).
    - Khi đơn ở trạng thái `PENDING`, Waiter được toàn quyền: Thêm món, Tăng số lượng, Giảm số lượng, Xóa món.
  - **Kiểm tra tồn kho nguyên liệu (Inventory Validation)**:
    - Khi Waiter tăng số lượng món (Ví dụ: Pizza x 2 → Pizza x 3), hệ thống bắt buộc kiểm tra tồn kho nguyên liệu theo định lượng công thức (Recipe).
    - Nếu đủ nguyên liệu: Cho phép tăng số lượng.
    - Nếu không đủ nguyên liệu: Hiển thị cảnh báo thiếu nguyên liệu và chặn tăng số lượng.
    - Tuyệt đối không cho phép tồn kho âm. Bắt buộc validate chặt chẽ ở cả Frontend và Backend.
  - **Xác nhận / Cập nhật đơn (`Submit / Update Order`)**:
    - Khi nhấn `[Đặt đơn]`: Hệ thống tạo Active Order (nếu chưa có) hoặc cập nhật Active Order hiện tại, gắn đúng `tableId`, đặt trạng thái đơn hàng là `PENDING`. Sau đó Waiter có thể nhấn Back quay lại danh sách bàn.
  - **Kết thúc bữa ăn & Liên kết Thanh toán**:
    - Tại bàn `OCCUPIED`, khi nhấn `[Kết thúc bữa ăn]`: Nếu bàn có Active Order, hệ thống hiển thị xác nhận và điều hướng sang trang Thanh toán (RM-016).
- **Nguồn**: `src/Acme.TooHungry.Domain/Orders`, Angular UI (`/waiter/order/:tableId`)
- **Thực thể/CRUD**: Order, OrderItem — list, tạo, sửa, xoá, cập nhật số lượng món.
- **Backend**: Đã hoàn thiện toàn bộ API quản lý Active Order theo bàn (`GetActiveOrderByTableIdAsync`, `SubmitOrderAsync`, `CancelActiveOrderAsync`), validation tồn kho khả dụng theo công thức Recipe (`ValidateStockAsync`), khấu trừ kho tự động FEFO, thông báo SignalR realtime (`TableHub`), Filtered Unique Index cho Active Order, và 100% test suite tự động.
- **Frontend**: Đã hoàn thiện giao diện gọi món cho Waiter `/waiter/order/:tableId` với Table Information Card, danh mục món Sidebar mở rộng, lưới 3 Food Cards bo góc, Food Detail Modal, Order Drawer với tính năng kiểm tra tồn kho realtime, xác nhận đặt đơn và hủy đơn an toàn, chuẩn nhận diện Cam & Trắng (`#EA580C`).
- **Phụ thuộc**: RM-006, RM-008, RM-015
- **Spec**: `specs/010-rm-010-pos-ordering-and-billing/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-011 — Quản lý Tồn kho & Giao dịch (operations, Wave 3)
- **Mô tả**: Quản lý số lượng nhập/xuất/tồn của các nguyên liệu, quản lý theo lô hàng (`InventoryBatch`), xuất kho tự động theo hạn sử dụng (FEFO), kiểm kê điều chỉnh và lịch sử giao dịch bất biến (`InventoryTransaction`).
- **Nguồn**: `src/Acme.TooHungry.Domain/Inventories`
- **Thực thể/CRUD**: `InventoryBatch`, `InventoryTransaction` — Quản lý lô, Nhập kho (Inbound), Xuất kho tự động (FEFO), Kiểm kê cân đối kho (Adjustment), Cảnh báo hạn dùng (Alerts), Tiêu hủy lô hàng (Discard).
- **Backend**: Đã hoàn thành toàn bộ Domain Service (`InventoryManager`), Application Service (`InventoryAppService`), DTOs, EF Core Composite Index & Migration, REST Controller (`InventoryController`), phân quyền chi tiết và 100% test suite tự động.
- **Phụ thuộc**: RM-005
- **Spec**: `specs/011-rm-011-inventory-transactions/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-012 — Giao diện Tồn kho UI Redesign (operations, Wave 3)
- **Mô tả**: Làm lại giao diện trang quản lý tồn kho để thân thiện hơn với người dùng.
- **Nguồn**: N/A
- **Thực thể/CRUD**: N/A
- **Backend**: Tận dụng API có sẵn từ RM-011.
- **Phụ thuộc**: RM-011
- **Spec**: `specs/012-rm-012-inventory-ui-redesign/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-013 — Tồn kho - Khóa/Khôi phục (operations, Wave 3)
- **Mô tả**: Quản lý vòng đời tạm ngưng, cách ly và khôi phục an toàn ở cả 2 cấp độ: Mặt hàng nguyên liệu (`Ingredient`) và Lô hàng thực tế (`InventoryBatch`). Hỗ trợ cơ chế vô hiệu hóa dây chuyền (Cascading Deactivation) đến Recipe/Dish, loại trừ lô bị khóa khỏi thuật toán FEFO, màn hình quản lý nguyên liệu đã vô hiệu hóa, và khôi phục thông minh (Smart Restoration) khi thiết lập kho.
- **Nguồn**: `src/Acme.TooHungry.Domain/Ingredients`, `src/Acme.TooHungry.Domain/Inventories`, Angular UI (`/inventory`, `/ingredients/deactivated`)
- **Thực thể/CRUD**: `Ingredient`, `InventoryBatch` — Deactivate, Reactivate, SmartRestore, DeactivateBatch, ReactivateBatch.
- **Backend**: Đã hoàn thành toàn bộ Domain logic (`IngredientManager.DeactivateAsync` kích hoạt Cascading Deactivation tự động khóa Recipe & Dish liên quan nhưng bảo toàn đơn POS dở dang; `InventoryBatch` thêm `DeactivationReason` và cập nhật thuật toán FEFO loại bỏ lô Inactive), Application Services (`IngredientAppService`, `InventoryAppService`), DTOs, EF Core Migration, phân quyền chi tiết (`TooHungryPermissions.Inventories.DeactivateBatch`), và 100% test suites tự động.
- **Frontend**: Đã hoàn thành Tab 1 & Tab 2 trên `/inventory` (Modal tạm ngưng kèm cảnh báo tồn kho, modal tạm khóa lô theo lý do mẫu, nút kích hoạt lại, bộ lọc trạng thái hoạt động), màn hình chuyên biệt `/ingredients/deactivated` bảng 4 cột tinh gọn, hộp thoại Khôi phục thông minh khi tạo nguyên liệu trùng tên bị khóa, huy hiệu cảnh báo vàng cam trên Recipe & Dish, và bộ từ điển i18n song ngữ đầy đủ (`en.json`, `vi.json`).
- **Phụ thuộc**: RM-011
- **Spec**: `specs/013-rm-013-inventory-deactivate-restore/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-014 — Dự báo (operations, Wave 4)
- **Mô tả**: Dự báo doanh thu, nhu cầu món ăn và nguyên liệu cần mua dựa trên dữ liệu quá khứ.
- **Nguồn**: `src/Acme.TooHungry.Domain/Forecasts`, `angular/src/app/forecast/`
- **Thực thể/CRUD**: DemandForecast, DemandForecastItem, IngredientPlan, IngredientPlanItem — list, tạo, sửa, xóa, phân tích dự báo, bóc tách định lượng nguyên liệu, đối soát tồn kho và xuất bảng kê mua hàng.
- **Backend**: Đã hoàn thành toàn diện Domain, EF Core DbContext, DTOs, Application Services (`DemandForecastAppService`, `IngredientPlanAppService`), Controllers (`ForecastController`), phân quyền (`TooHungryPermissions.Forecasts.*`), thuật toán SMA 7/14/30 ngày làm tròn trần, bóc tách công thức (Recipe Explosion) tự động sinh Kế hoạch nguyên liệu (`IngredientPlan`), đối soát tồn kho khả dụng (`CurrentStock`), tính toán số lượng gợi ý mua thêm và phân tích tài chính dự toán 4 thẻ KPI. 100% kiểm thử tự động đạt chuẩn PASS.
- **Frontend**: Đã hoàn thành giao diện Angular chuẩn nhận diện Cam & Trắng (`/forecasts`, `/forecasts/detail/:id`), modal tạo dự báo tự động tính SMA (`ForecastCreateComponent`), màn hình chi tiết 4 thẻ KPI tài chính, 2 tab chuyển đổi (Món ăn & Kế hoạch nguyên liệu), phê duyệt kế hoạch, xuất file Excel CSV UTF-8 BOM (`KeHoachMuaHang_YYYYMMDD_YYYYMMDD.csv`) và in phiếu chuẩn bị bếp khổ A4 chuyên biệt (@media print). Đồng bộ 100% từ điển song ngữ trong `vi.json` và `en.json`.
- **Phụ thuộc**: RM-010, RM-011, RM-016
- **Spec**: [014-rm-014-forecasts](../specs/014-rm-014-forecasts/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-015 — Điều hướng & Bố cục Waiter (Waiter Routing & Layout) (waiter, Wave 2)
- **Mô tả**: Thiết lập cơ chế điều hướng dựa trên vai trò (Role-based routing) cho nhân viên phục vụ (`Waiter`) và xây dựng bộ Layout giao diện chuyên biệt cho phân hệ Waiter.
  - **Tự động điều hướng sau đăng nhập**:
    - Sau khi nhân viên có vai trò Waiter đăng nhập thành công qua RM-001 → hệ thống tự động điều hướng trực tiếp vào trang danh sách bàn mặc định `/waiter/tables`.
  - **Bộ Layout Waiter chuyên biệt gồm 3 khu vực**:
    + **Sidebar**: Dùng cho công cụ Tìm kiếm và Bộ lọc (Search/Filter). Nội dung Sidebar có khả năng thay đổi linh hoạt tùy theo ngữ cảnh của từng trang (Ví dụ: tại trang Danh sách bàn dùng để lọc bàn theo khu vực/trạng thái; tại trang Order hiển thị Thẻ thông tin bàn và bộ lọc danh mục món).
    + **Topbar**: Thanh điều hướng trên cùng, chỉ hiển thị thông tin chung của hệ thống (tên nhà hàng, thông tin ca trực/nhân viên đăng nhập).
    + **Main Content**: Không gian trung tâm hiển thị nội dung chính của trang.
  - **Route mặc định**: `/waiter/tables`.
  - **Phân quyền truy cập (Auth Guard)**: Bảo vệ toàn bộ cụm route `/waiter/*`, chỉ cho phép tài khoản có vai trò Waiter (hoặc quyền phục vụ) truy cập.
- **Nguồn**: `angular/src/app/waiter/`
- **Thực thể/CRUD**: N/A (UI Layout Component & Angular Routing Guard).
- **Backend**: Tận dụng ABP Identity / Role & Permission Management từ RM-003.
- **Phụ thuộc**: RM-001, RM-002, RM-003
- **Spec**: `specs/015-rm-015-waiter-routing-and-layout/`
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-016 — Thanh toán đơn hàng (Payment Page) (operations, Wave 3)
- **Mô tả**: Màn hình thanh toán đơn hàng độc lập dành cho Waiter và Cashier khi khách kết thúc bữa ăn tại bàn có Order.
  - **Cấu trúc & Bố cục giao diện**:
    - Màn hình chuyên biệt độc lập, **KHÔNG sử dụng Sidebar và Topbar** thông thường của Waiter layout.
    - **Đầu trang**: Nút `[← Quay lại danh sách bàn]` điều hướng về `/waiter/tables`.
    - **Header Card**: Hiển thị thông tin tổng quan gồm: Tiêu đề "Thanh toán đơn hàng", Mã Order, Tên bàn, Ngày giờ lập hóa đơn; góc bên phải hiển thị trạng thái đơn hàng (Order Status).
  - **Bố cục 2 cột chia tỉ lệ 60% : 40%**:
    - **Cột trái (60%) — Hóa đơn đơn hàng (Order Invoice)**: Hiển thị đầy đủ Order ID, Tên bàn, Ngày giờ, Danh sách chi tiết các món ăn đã gọi, Số lượng, Đơn giá, Thành tiền và Tổng tiền thanh toán.
    - **Cột phải (40%) — Phương thức thanh toán (Payment Method)**:
      + `Tiền mặt` (Cash).
      + `Chuyển khoản QR` (QR Payment) — hiển thị mã VietQR thanh toán. Phương thức QR hiện tại áp dụng cơ chế **xác nhận thủ công** (`Manual Confirmation` bởi nhân viên, không tự động xác minh giao dịch ngân hàng).
  - **Phân quyền xác nhận thanh toán (Payment Permission)**:
    - Chỉ người dùng có vai trò `Waiter` hoặc `Cashier` mới được phép thao tác bấm nút `[Đã xác nhận thanh toán]`.
  - **Luồng xác nhận thanh toán & Chuyển trạng thái**:
    - Khi bấm `[Đã xác nhận thanh toán]`: Hệ thống ghi nhận thanh toán thành công.
    - Cập nhật trạng thái đơn hàng: `Order → PAID / COMPLETED`.
    - Tự động chuyển trạng thái bàn ăn: `Table → CLEANING` (bàn chuyển sang trạng thái dọn dẹp, hoàn tất phiên phục vụ và khép kín chu trình chuyển sang bước dọn bàn tại RM-008).
- **Nguồn**: `src/Acme.TooHungry.Domain/Orders`, Angular UI (`/waiter/payment/:orderId`)
- **Thực thể/CRUD**: Order, Payment — cập nhật trạng thái đơn hàng sang Completed, kích hoạt chuyển trạng thái bàn sang Cleaning.
- **Backend**: Cần API xác nhận thanh toán và cập nhật đồng thời trạng thái Order và Table (`CompletePaymentAsync`).
- **Phụ thuộc**: RM-010
- **Spec**: [016-rm-016-payment-page](../specs/016-rm-016-payment-page/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign) (setup, Wave 2)
- **Mô tả**: Tái thiết kế toàn diện giao diện và tối ưu trải nghiệm người dùng (UI/UX Redesign) cho phân hệ Quản lý Bàn ăn (`/tables` và `/waiter/tables`).
  - **Mục tiêu chính**:
    - Nâng cấp giao diện sơ đồ bàn / danh sách bàn ăn sang phong cách hiện đại, chuẩn nhận diện Cam & Trắng (`#EA580C`), bo góc mềm mại, hiển thị trực quan và thanh lịch.
    - Cải tiến thẻ bàn (Table Card): Hiển thị rõ ràng trạng thái phục vụ, đồng bộ thời gian sử dụng bàn theo thời gian thực (Elapsed Seated Time), đếm thời lượng phiên dùng bữa, cảnh báo bàn ngồi lâu (> 90 phút).
    - Tối ưu hóa các hộp thoại tương tác ngữ cảnh: Modal Đón khách, Đặt bàn trước (Reservation), Xác nhận kết thúc bữa ăn với Timeline tiến trình trực quan (`Seated At → Elapsed → Ended At`).
    - Nâng cấp tính năng quản trị sơ đồ bàn của Admin/Manager (`/tables`): Chuyển bàn, gộp bàn, cấu hình sơ đồ khu vực linh hoạt, tối ưu hiệu năng render danh sách bàn số lượng lớn.
    - Đảm bảo trải nghiệm Responsive mượt mà trên mọi thiết bị (máy POS bán hàng, tablet, mobile của nhân viên).
- **Nguồn**: `angular/src/app/table/`, `angular/src/app/waiter/tables/`, `src/Acme.TooHungry.Domain/Tables`
- **Thực thể/CRUD**: `RestaurantTable`, `DiningArea` — Redesign UI/UX, tái cấu trúc component, tối ưu luồng thao tác.
- **Backend**: Tận dụng và mở rộng hệ thống API hiện có từ RM-008 và Realtime SignalR (`TableHub`).
- **Phụ thuộc**: RM-008, RM-015
- **Spec**: [017-rm-017-table-management-redesign](../specs/017-rm-017-table-management-redesign/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-018 — Làm mới trang Dashboard (Dashboard Redesign) (dashboard, Wave 4)
- **Mô tả**: Tái thiết kế toàn diện giao diện và nâng cấp trải nghiệm Dashboard trung tâm (`/`), tối ưu cho quản lý nhà hàng và nhân viên vận hành:
  - Nâng cấp visual chuẩn nhận diện Cam & Trắng (`#EA580C`), phong cách Bento Grid / Card hiện đại, hiển thị trực quan và tương thích responsive đa thiết bị (Desktop, Tablet).
  - Khối KPI tổng quan thời gian thực: Doanh thu trong ngày, Tổng số đơn hàng, Tỷ lệ lấp đầy bàn ăn (Table Occupancy Rate), Cảnh báo tồn kho / nguyên liệu sắp hết / quá hạn.
  - Biểu đồ thống kê trực quan: Biểu đồ xu hướng doanh thu & đơn hàng theo giờ trong ngày, Top món ăn bán chạy nhất (Best Sellers), Thống kê trạng thái bàn trực tiếp (Live Table Map Summary).
  - Khối tác vụ nhanh (Quick Actions) điều hướng tiện lợi: Quản lý món ăn, Đặt bàn / Sơ đồ bàn, Kiểm kê kho, Xem báo cáo dự báo.
  - Tích hợp cảnh báo vận hành thông minh và cập nhật số liệu theo thời gian thực (Realtime SignalR) mà không cần reload trang.
- **Nguồn**: `angular/src/app/home/`, `src/Acme.TooHungry.Domain/Orders`, `src/Acme.TooHungry.Domain/Inventories`, `src/Acme.TooHungry.Domain/Tables`
- **Thực thể/CRUD**: Dashboard DTOs / Aggregation Services — Tổng hợp dữ liệu từ `Order`, `RestaurantTable`, `Dish`, `InventoryBatch`.
- **Backend**: Xây dựng Application Service chuyên biệt (`DashboardAppService` / `IDashboardAppService`) cung cấp endpoint tổng hợp thống kê tập trung (`GetDashboardSummaryAsync`), tối ưu hiệu năng truy vấn và tránh phân tán lời gọi API ở Frontend.
- **Phụ thuộc**: RM-002, RM-006, RM-008, RM-010, RM-011
- **Spec**: [018-rm-018-dashboard-redesign](../specs/018-rm-018-dashboard-redesign/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)

### RM-019 — Trang báo lỗi & Phục hồi điều hướng (Error Pages & Recovery Routing) (shared, Wave 4)
- **Mô tả**: Thiết kế và triển khai bộ trang thông báo lỗi hệ thống hiện đại (404 Not Found, 403 Forbidden, 500 Internal Server Error / 505 HTTP Version Not Supported) kèm cơ chế điều hướng phục hồi thông minh theo vai trò và tự động trả người dùng về trang làm việc sau 5 giây:
  - **Thiết kế giao diện hiện đại & Thân thiện (Modern Error UX/UI)**:
    + Tone màu chủ đạo nhận diện Cam & Trắng (`#EA580C`), phong cách Card / Glassmorphism bo góc mềm mại, hiển thị đẹp mắt và chuyên nghiệp trên cả Desktop, Tablet và Mobile.
    + Minh họa Vector / SVG sinh động riêng biệt cho từng mã lỗi:
      * **404 — Không tìm thấy trang (Page Not Found)**: Minh họa bàn ăn trống hoặc bản đồ thất lạc khi truy cập đường dẫn không tồn tại (Wildcard route `**`).
      * **403 — Truy cập bị từ chối (Forbidden / Access Denied)**: Minh họa ổ khóa bảo mật / khiên phân quyền khi người dùng cố truy cập trang ngoài phạm vi quyền hạn của vai trò.
      * **500 / 505 — Sự cố hệ thống / Máy chủ không phản hồi (Server Error)**: Minh họa kết nối gián đoạn, thông báo thân thiện và hiển thị mã tham chiếu lỗi (Error Trace ID) an toàn để hỗ trợ kỹ thuật mà không làm lộ stack trace nội bộ.
  - **Nút hành động quay lại trang thuộc về người dùng (Role-based Recovery Button)**:
    + Cung cấp nút bấm hành động chính nổi bật: `[Quay về trang chính của tôi]` (Return to My Home).
    + Cơ chế tự động nhận diện vai trò người dùng hiện tại (`currentUser.roles`) để điều hướng chính xác về không gian làm việc chuyên môn:
      * **Waiter (Nhân viên phục vụ)**: Điều hướng về `/waiter/tables` (Danh sách bàn ăn phục vụ).
      * **Admin / Manager (Quản trị viên & Quản lý)**: Điều hướng về `/` (Dashboard trung tâm) **nếu có quyền xem Dashboard** (`TooHungry.Dashboard`); nếu không có quyền, tự động chuyển về trang nghiệp vụ đầu tiên được phân quyền (`/tables`, `/orders`, `/dishes`, `/inventory`...) để tránh vòng lặp lỗi 403.
      * **Cashier (Thu ngân)**: Điều hướng về `/table/layout` hoặc `/tables`.
      * **InventoryStaff (Thủ kho)**: Điều hướng về `/inventory`.
      * **Khách / Chưa đăng nhập (Unauthenticated)**: Điều hướng về `/account/login` hoặc `/` (Trạm vào ca nội bộ).
    + Cung cấp nút hành động phụ tùy ngữ cảnh: `[Thử lại]` (Retry request) đối với lỗi 500/505, hoặc `[Đổi tài khoản / Đăng xuất]` đối với lỗi 403.
  - **Cơ chế đếm ngược tự động trả về trang sau 5 giây (5-Second Auto-Recovery Countdown)**:
    + Khi trang lỗi xuất hiện, nếu người dùng không thực hiện bất kỳ thao tác nào, hệ thống tự động kích hoạt đồng hồ đếm ngược trực quan:
      *"Hệ thống sẽ tự động đưa bạn về trang làm việc sau 5... 4... 3... 2... 1 giây..."* (kèm thanh tiến trình progress bar đếm ngược mượt mà).
    + Cho phép người dùng bấm `[Dừng đếm ngược]` hoặc di chuột/tương tác vào màn hình để dừng đồng hồ nếu muốn ở lại đọc thông tin kỹ thuật hoặc copy mã lỗi.
    + Sau 5 giây đếm ngược kết thúc mà không bị dừng: Tự động kích hoạt điều hướng về trang tương ứng của vai trò người dùng mà không cần bấm nút.
  - **Phạm vi áp dụng đồng bộ**:
    + Áp dụng thống nhất cho toàn bộ các nhóm người dùng: **Admin**, **Manager**, **Waiter** và các nhân viên vận hành khác.
  - **Tích hợp kỹ thuật trong Angular & ABP Framework**:
    + Cấu hình Angular Router Wildcard `**` chuyển tiếp về trang 404.
    + Tích hợp với `smartPermissionGuard`, ABP `HttpErrorReporterService` và HTTP Error Interceptor để bắt mã 403, 500, 505 thay thế hoàn toàn các dialog lỗi thô sơ mặc định.
    + Xây dựng `UserRoleNavigationService` tập trung cung cấp hàm xác định URL đích theo vai trò người dùng để tái sử dụng xuyên suốt toàn bộ ứng dụng.
  - **Đa ngôn ngữ & Quốc tế hóa (i18n)**:
    + 100% toàn bộ tiêu đề lỗi, thông điệp hướng dẫn, nhãn nút thao tác và câu thông báo đếm ngược được cấu hình đầy đủ trong `vi.json` và `en.json`.
- **Nguồn**: `angular/src/app/`, ABP Http Error Handling, Angular Router
- **Thực thể/CRUD**: N/A (UI Layout, Routing & Error Handling Components).
- **Backend**: Tận dụng cơ chế chuẩn hóa lỗi của ABP Framework (`AbpValidationException`, `UserFriendlyException`, HTTP status codes 403, 404, 500).
- **Phụ thuộc**: RM-001, RM-002, RM-003, RM-015
- **Spec**: [019-rm-019-error-pages-and-recovery](../specs/019-rm-019-error-pages-and-recovery/spec.md)
- **Trạng thái**: xong
- **Nợ phát sinh**:
  - (trống)


