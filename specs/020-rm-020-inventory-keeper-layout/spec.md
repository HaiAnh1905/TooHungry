# Đặc tả Tính năng (Feature Specification): Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)

**Mã Tính năng (Feature ID)**: `RM-020`

**Nhánh Tính năng (Feature Branch)**: `020-rm-020-inventory-keeper-layout`

**Ngày lập**: 2026-10-19

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-020: *"Thiết lập cơ chế điều hướng theo vai trò (Role-based routing) và xây dựng bộ Layout / không gian làm việc chuyên biệt dành riêng cho Thủ kho (`InventoryStaff` / `InventoryKeeper`), tương tự như cơ chế của phân hệ Waiter (`RM-015`)."*
- Tích hợp và kế thừa từ các phân hệ:
  - RM-001: Xác thực đăng nhập & Quản lý phiên người dùng ABP Identity
  - RM-002: Hệ thống Shared UI, component dùng chung và chuẩn nhận diện thương hiệu Cam & Trắng (`#EA580C`)
  - RM-003: Phân quyền & Vai trò người dùng (`InventoryStaff`, `Manager`, `Administrator`)
  - RM-011: Quản lý Tồn kho & Giao dịch, lô hàng (`InventoryBatch`), xuất kho FEFO và kiểm kê điều chỉnh
  - RM-012: Giao diện Tồn kho và các component modal nghiệp vụ
  - RM-013: Vòng đời tạm ngưng, khóa và khôi phục an toàn lô hàng (`DeactivateBatch`, `ReactivateBatch`)
  - RM-015: Kiến trúc bố cục 3 vùng độc lập (Topbar, Contextual Sidebar, Main Content) và mô hình Service-driven Portal
  - RM-019: Hệ thống Trang báo lỗi Bento Card & Cơ chế phục hồi điều hướng thông minh theo vai trò (`UserRoleNavigationService`)

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 19-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.clarify` - 6 Quyết định Then chốt)

- **Q1: Định tuyến cơ sở và Cấu trúc không gian làm việc của Thủ kho**: Phân hệ riêng của Thủ kho (`/inventory-keeper`) nên được cấu trúc điều hướng như thế nào so với trang quản trị `/inventory` hiện có?
  - **A1**: **Cấu trúc đa trang con gồm 3 route con chuyên biệt, giữ nguyên trang `/inventory` cũ cho cấp Quản lý / Admin**:
    - Đường dẫn cơ sở: `/inventory-keeper` (với alias `/keeper` tự động chuyển hướng về `/inventory-keeper`).
    - Cụm 3 màn hình nghiệp vụ con:
      + `/inventory-keeper/dashboard`: Bảng điều khiển tổng quan chỉ số kho, hạn dùng FEFO, 3 khối cảnh báo khẩn cấp và các tác vụ nhanh.
      + `/inventory-keeper/batches`: Quản lý danh mục lô hàng, phân loại điều kiện bảo quản (Mát / Đông / Khô) và thao tác 1 chạm (Nhập kho nhanh, Xuất hủy, Tạm khóa / Mở khóa lô).
      + `/inventory-keeper/transactions`: Nhật ký biến động kho xuất nhập tồn bất biến và thực hiện biên bản kiểm kê cân đối kho (RM-011).
    - Giữ nguyên trang `/inventory` hiện có dành cho Quản lý (`Manager`) và Quản trị viên (`Administrator`) tra cứu báo cáo tổng hợp hệ thống.
- **Q2: Cơ chế Quét mã Barcode / QR lô hàng tại quầy kho**: Tính năng quét mã vạch tại quầy kho nên được hỗ trợ theo cơ chế nào?
  - **A2**: **Hỗ trợ song hành cả hai phương thức: Bắt tín hiệu phần cứng HID (USB/Bluetooth) và Quét Camera HTML5 trên di động**:
    - *Phương thức 1 (Quầy kho / Desktop)*: Tự động lắng nghe tín hiệu từ máy quét mã vạch chuyên dụng (USB/Bluetooth Barcode Scanner hoạt động như thiết bị HID Keyboard gõ nhanh chuỗi ký tự kết thúc bằng Enter). Khi quét trúng mã lô hoặc mã nguyên liệu, hệ thống tự động nhận diện mà không bắt buộc thủ kho phải click chuột vào ô input.
    - *Phương thức 2 (Kiểm kê di động / Tablet)*: Cung cấp nút bấm `[Quét mã]` trên Sidebar / Drawer để mở hộp thoại Camera quét mã QR / Barcode trực tiếp qua màn hình cảm ứng.
    - Sau khi quét thành công, hệ thống lập tức lọc bảng và cuộn mượt (smooth scroll) đến đúng lô hàng tương ứng trong vòng dưới 200ms.
- **Q3: Cơ chế cập nhật số liệu và Cảnh báo KPI trên Topbar**: 3 Thẻ cảnh báo KPI trên Topbar (Lô cận date, Thiếu tồn an toàn, Lô quá hạn) nên được cập nhật theo cơ chế nào?
  - **A3**: **Tải dữ liệu ban đầu khi vào ca, tự động làm mới tức thì sau mỗi thao tác kho, kèm nút `[Làm mới]` thủ công**:
    - Khi thủ kho truy cập phân hệ, hệ thống tải dữ liệu tổng hợp cảnh báo ban đầu từ backend.
    - Xây dựng cơ chế thông báo phản ứng nhanh (Reactive Refresh Event / Subject) để tự động làm mới ngay lập tức các chỉ số cảnh báo sau khi hoàn tất bất kỳ thao tác nào: Nhập lô mới, Xuất hủy lô, Tạm khóa lô (RM-013), Mở khóa lô, hoặc Kiểm kê điều chỉnh.
    - Cung cấp thêm nút icon `[Làm mới]` (kèm hiệu ứng xoay tròn mượt mà) trên Topbar để thủ kho có thể chủ động đối soát số liệu bất cứ lúc nào mà không cần tải lại toàn bộ trang.
- **Q4: Tự động điều hướng theo vai trò (Role-based Routing) & Gác cổng `inventoryKeeperAuthGuard`**:
  - **A4**:
    - Khi người dùng có vai trò `InventoryStaff` đăng nhập thành công qua RM-001 hoặc truy cập URL gốc `/`, hệ thống tự động đưa thẳng vào `/inventory-keeper/dashboard`.
    - Bảo vệ toàn bộ cụm tuyến đường `/inventory-keeper/*` bằng `inventoryKeeperAuthGuard`: Chỉ cho phép `InventoryStaff`, `Manager` hoặc `Administrator` (sở hữu quyền `TooHungry.Inventories`) truy cập.
    - Các vai trò khác (như `Waiter`, `Cashier`) bị chặn (403 Forbidden) và điều hướng về không gian tương ứng của họ.
- **Q5: Tái sử dụng trọn vẹn API Backend & Modal nghiệp vụ**:
  - **A5**: Phân hệ Thủ kho tái sử dụng 100% hợp đồng API hiện có từ backend (`IInventoryAppService`, `IIngredientAppService`) và các Modal component đã được kiểm thử chặt chẽ (`CreateInventoryBatchModalComponent`, `DiscardBatchModalComponent`, `DeactivateBatchModalComponent`, `StockAdjustmentModalComponent`), không làm phát sinh nợ kỹ thuật backend.
- **Q6: Trải nghiệm Thiết bị Cầm tay (Tablet/Mobile) & Phục hồi Điều hướng (RM-019)**:
  - **A6**:
    - Trên màn hình < 992px, Sidebar tự động chuyển đổi thành Drawer trượt (Offcanvas) từ mép trái, mở ra khi chạm nút `[Bộ lọc & Quét mã]` trên Topbar, chuẩn kích thước chạm touch target >= 44×44px.
    - Đồng bộ hoàn hảo với `UserRoleNavigationService` của RM-019: Khi tài khoản `InventoryStaff` gặp lỗi 404, 403 hoặc 500, hệ thống tự động đếm ngược 5 giây và đưa họ an toàn trở về `/inventory-keeper/dashboard`.
    - 100% văn bản, nhãn nút, thẻ cảnh báo được cấu hình song ngữ trong `vi.json` và `en.json`.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trong vận hành nhà hàng chuyên nghiệp, **Thủ kho (Inventory Keeper / Inventory Staff)** là mắt xích kiểm soát toàn bộ nguyên liệu đầu vào, bảo quản và cấp phát cho khu vực Bếp và Bar. Khác với người quản trị hệ thống ngồi văn phòng cần cấu hình danh mục hoặc nhân viên phục vụ bàn di chuyển liên tục giữa các bàn khách, Thủ kho làm việc trực tiếp tại quầy kho, kho đông, kho mát với các yêu cầu đặc thù:
1. **Tốc độ và tính trực quan**: Cần nhìn thấy ngay các cảnh báo khẩn cấp (lô hàng sắp hết hạn trong 3 ngày tới, nguyên liệu chạm ngưỡng tồn kho tối thiểu, lô quá hạn cần xuất hủy lập biên bản).
2. **Thao tác nhanh tại chỗ (Quick Actions)**: Quét hoặc nhập nhanh mã lô để kiểm tra hạn sử dụng, nhập lô hàng mới từ nhà cung cấp khi xe giao hàng tới, hoặc bấm xuất hủy nhanh một lô hàng bị hỏng.
3. **Không gian làm việc tập trung (Distraction-free Workspace)**: Không bị phân tâm bởi các thanh menu quản trị cồng kềnh (Quản lý bàn, Đặt bàn, Quản trị người dùng, Cấu hình OpenIddict).

**RM-020 (Phân hệ & Bố cục Thủ kho)** ra đời nhằm hiện thực hóa không gian làm việc chuyên biệt này, đóng vai trò như một "Khoang lái tác nghiệp" (Operational Cockpit) dành riêng cho Thủ kho, tương tự như những gì RM-015 đã mang lại cho Nhân viên phục vụ bàn.

### Sơ đồ Kiến trúc & Luồng Điều hướng Phân hệ Thủ kho:
```text
                    ĐĂNG NHẬP HỆ THỐNG (RM-001)
                                │
                                ▼
        ┌───────────────────────────────────────────────┐
        │  Bộ phân giải vai trò (UserRoleNavigation)     │
        └───────┬───────────────────────────────┬───────┘
                │ Vai trò Waiter                │ Vai trò InventoryStaff
                ▼                               ▼
     /waiter/tables (RM-015)        /inventory-keeper (RM-020)
                                                │
                                                ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │           BỘ BỐ CỤC CHUYÊN BIỆT THỦ KHO (InventoryKeeperLayout)        │
     ├────────────────────────────────────────────────────────────────────────┤
     │  TOPBAR:                                                               │
     │  - Brand "Acme.TooHungry" │ Ca trực kho │ KPI Cảnh báo khẩn cấp         │
     │  - Nút [Quay lại Quản trị] (Admin/Manager) │ Nút [Đăng xuất]           │
     ├──────────────────────────┬─────────────────────────────────────────────┤
     │  SIDEBAR NGỮ CẢNH ĐỘNG:  │  MAIN CONTENT (Không gian làm việc chính):  │
     │  - Tìm kiếm mã lô/tên    │  ┌───────────────────────────────────────┐  │
     │  - Nút [Quét Barcode/QR] │  │ Tab 1: /inventory-keeper/dashboard    │  │
     │  - Lọc nhiệt độ bảo quản │  │ (Bảng điều khiển FEFO & Cảnh báo)     │  │
     │    (Mát / Đông / Khô)    │  ├───────────────────────────────────────┤  │
     │  - Lọc trạng thái lô:    │  │ Tab 2: /inventory-keeper/batches      │  │
     │    (Đang dùng, Cận date, │  │ (Danh mục lô & Thao tác 1 chạm)       │  │
     │     Hết hạn, Đã khóa)    │  ├───────────────────────────────────────┤  │
     │                          │  │ Tab 3: /inventory-keeper/transactions │  │
     │                          │  │ (Nhật ký biến động kho & Kiểm kê)     │  │
     │                          │  └───────────────────────────────────────┘  │
     └──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 — Tự động Điều hướng theo Vai trò sau Đăng nhập (Priority: P1)

Là một **Thủ kho (InventoryStaff)**, sau khi tôi đăng nhập thành công vào hệ thống bằng tài khoản của mình qua RM-001, tôi muốn hệ thống tự động đưa tôi thẳng vào không gian làm việc chuyên biệt `/inventory-keeper/dashboard` mà không phải bấm tìm qua menu quản trị, để tôi có thể nắm bắt ngay tình hình kho và bắt đầu công việc kiểm soát kho.

**Lý do ưu tiên**: Tiết kiệm thời gian đăng nhập đầu ca, ngăn ngừa thao tác nhầm lẫn vào các trang quản trị không thuộc nghiệp vụ của nhân viên kho.

**Kiểm thử Độc lập**:
- Đăng nhập bằng tài khoản có vai trò `InventoryStaff`.
- Xác minh trình duyệt tự động chuyển hướng về `/inventory-keeper/dashboard`.
- Truy cập vào URL gốc `/` khi đang đăng nhập bằng `InventoryStaff` -> tự động chuyển về `/inventory-keeper/dashboard`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên sở hữu vai trò `InventoryStaff` đang ở màn hình Đăng nhập (RM-001), **Khi (When)** nhập đúng thông tin tài khoản và đăng nhập thành công, **Thì (Then)** hệ thống tự động điều hướng trực tiếp đến URL `/inventory-keeper/dashboard`.
2. **Cho trước (Given)** người dùng đã đăng nhập với vai trò `InventoryStaff`, **Khi (When)** người dùng gõ URL gốc `/` hoặc `/inventory-keeper`, **Thì (Then)** hệ thống tự động điều hướng về `/inventory-keeper/dashboard`.
3. **Cho trước (Given)** người dùng có vai trò `InventoryStaff`, **Khi (When)** cố tình truy cập vào các URL quản trị bị giới hạn (ví dụ `/identity/users`, `/identity/roles`, `/waiter/tables`), **Thì (Then)** bộ gác cổng phân quyền từ chối truy cập (403 Forbidden) và màn hình lỗi RM-019 cung cấp nút quay về `/inventory-keeper/dashboard`.

---

### User Story 2 — Cấu trúc Bố cục Giao diện Thủ kho Chuyên biệt 3 Vùng (Priority: P1)

Là một **Thủ kho**, tôi muốn làm việc trên một giao diện chuyên biệt được phân chia khoa học thành 3 vùng (Topbar ở trên cùng, Sidebar tìm kiếm/bộ lọc ở bên trái, và Main Content ở trung tâm), không bị chiếm diện tích bởi các thanh điều hướng quản trị cồng kềnh, giúp tôi tập trung tối đa vào dữ liệu kho và kiểm soát hạn dùng.

**Lý do ưu tiên**: Bố cục chuyên biệt là khung xương sống cho toàn bộ phân hệ. Thiết kế chuẩn mực giúp tăng tốc độ thao tác và nâng cao độ chính xác khi đối soát hàng hóa.

**Kiểm thử Độc lập**:
- Truy cập `/inventory-keeper/dashboard`.
- Quan sát Topbar: Logo "Acme.TooHungry", Tên thủ kho, badge Ca trực kho, 3 thẻ badge KPI (Cận date, Thiếu hàng, Quá hạn), nút lối tắt quản trị (nếu có quyền), nút đăng xuất.
- Quan sát Sidebar: Thanh tìm kiếm nhanh, nút quét mã, bộ lọc nhiệt độ bảo quản, bộ lọc trạng thái lô.
- Quan sát Main Content: Không gian hiển thị bảng Bento Card sạch sẽ, không có menu ABP admin.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng đang ở bất kỳ màn hình nào thuộc cụm `/inventory-keeper/*`, **Khi (When)** trang hiển thị, **Thì (Then)** giao diện bắt buộc tuân thủ cấu trúc 3 phân vùng:
   - **Topbar**: Cố định trên cùng (chiều cao 64px), tone màu trắng tinh gọn viền xám nhạt (`border-b border-gray-200`), logo nhà hàng nổi bật sắc cam `#EA580C`.
   - **Sidebar**: Nằm ở cạnh trái (chiều rộng cố định 280px trên desktop), màu nền trắng sạch sẽ, chứa toàn bộ công cụ tìm kiếm và lọc chuyên sâu cho kho.
   - **Main Content**: Không gian trung tâm cuộn độc lập, hiển thị nội dung các trang con qua `<router-outlet>`.
2. **Cho trước (Given)** thanh Topbar của Thủ kho, **Khi (When)** người dùng quan sát, **Thì (Then)** hệ thống tự động tính toán và hiển thị ca trực kho dựa theo đồng hồ thời gian thực:
   - Ca Sáng: `08:00 - 15:00` (Badge xanh lá `[Ca Sáng]`).
   - Ca Chiều/Tối: `15:00 - 22:00` (Badge xanh dương `[Ca Chiều/Tối]`).
   - Ngoài ca trực: `22:00 - 08:00` (Badge xám `[Ngoài Ca Trực]`).
3. **Cho trước (Given)** thanh Topbar của Thủ kho, **Khi (When)** có cảnh báo kho trong ca, **Thì (Then)** hiển thị 3 badge KPI cảnh báo số lượng có màu sắc tương ứng:
   - Badge Cam: Số lượng lô sắp hết hạn trong vòng 7 ngày (Expiring soon).
   - Badge Đỏ: Số lượng nguyên liệu dưới định mức tồn an toàn (Low stock).
   - Badge Đen/Tím: Số lượng lô đã quá hạn chưa xuất hủy (Expired / Discard needed).
   - Bấm vào từng badge sẽ tự động áp dụng bộ lọc tương ứng trên bảng dữ liệu.
4. **Cho trước (Given)** tài khoản đăng nhập là Quản lý (`Manager`) hoặc Quản trị viên (`Administrator`), **Khi (When)** truy cập vào phân hệ Thủ kho, **Thì (Then)** Topbar hiển thị thêm nút lối tắt `[Quay lại Quản trị]` ở góc phải, cho phép 1 chạm quay về Dashboard trung tâm (`/`). Đối với tài khoản thuần `InventoryStaff`, nút này bị ẩn hoàn toàn.

---

### User Story 3 — Bộ Gác cổng Tuyến đường (`inventoryKeeperAuthGuard`) (Priority: P1)

Là **Hệ thống An ninh & Phân quyền**, tôi muốn bảo vệ nghiêm ngặt toàn bộ cụm tuyến đường `/inventory-keeper/*` bằng bộ gác cổng `inventoryKeeperAuthGuard`, chỉ cho phép những tài khoản đã đăng nhập và sở hữu vai trò `InventoryStaff`, `Manager` hoặc `Administrator` (có quyền `TooHungry.Inventories`) truy cập, nhằm bảo mật số liệu tài sản kho và công thức bí mật của nhà hàng.

**Lý do ưu tiên**: Tránh việc thất thoát dữ liệu kiểm kê, rò rỉ đơn giá nhập nguyên liệu và ngăn chặn nhân viên phục vụ hoặc khách can thiệp vào kho hàng.

**Kiểm thử Độc lập**:
- Dùng trình duyệt ẩn danh chưa đăng nhập truy cập `/inventory-keeper` -> chuyển về `/account/login?returnUrl=/inventory-keeper`.
- Đăng nhập bằng tài khoản chỉ có vai trò `Waiter` truy cập `/inventory-keeper` -> bị từ chối 403 Forbidden.
- Đăng nhập bằng tài khoản `InventoryStaff` hoặc `Manager` -> truy cập thành công mượt mà.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng chưa đăng nhập, **Khi (When)** truy cập bất kỳ đường dẫn nào thuộc `/inventory-keeper/*`, **Thì (Then)** `inventoryKeeperAuthGuard` lập tức chặn lại và chuyển hướng về màn hình đăng nhập (`/account/login`), lưu trữ `returnUrl` để trả về đúng trang sau khi đăng nhập.
2. **Cho trước (Given)** người dùng đã đăng nhập với vai trò `InventoryStaff`, `Manager` hoặc `Administrator`, **Khi (When)** truy cập vào `/inventory-keeper/*`, **Thì (Then)** gác cổng cho phép truy cập hợp lệ.
3. **Cho trước (Given)** người dùng đã đăng nhập với vai trò không có thẩm quyền kho (như `Waiter` hoặc `Cashier`), **Khi (When)** cố tình truy cập vào `/inventory-keeper/*`, **Thì (Then)** hệ thống chặn lại, hiển thị màn hình 403 Bento Card RM-019 và đồng hồ tự động đưa người dùng về không gian của họ (`/waiter/tables` hoặc `/table/layout`).

---

### User Story 4 — Sidebar Ngữ cảnh Động & Công cụ Quét Barcode/Lọc Kho Nhanh (Priority: P1)

Là một **Thủ kho**, khi tôi đứng tại kho để phân loại và kiểm đếm nguyên liệu, tôi muốn thanh Sidebar bên trái cung cấp đầy đủ các bộ lọc đặc thù của kho (phân loại theo điều kiện bảo quản nhiệt độ, trạng thái hạn dùng của lô) cùng tính năng tìm kiếm nhanh mã lô / quét mã barcode, để tôi có thể tra cứu thông tin bất kỳ lô hàng nào chỉ trong vài giây.

**Lý do ưu tiên**: Trong kho hàng có hàng trăm lô nguyên liệu với các điều kiện bảo quản khác nhau; bộ lọc nhanh và tìm kiếm tức thì là công cụ sống còn để vận hành theo nguyên tắc FEFO (First-Expired, First-Out).

**Kiểm thử Độc lập**:
- Gõ từ khóa vào ô tìm kiếm: Danh sách lô/nguyên liệu tự động lọc theo thời gian thực (debounce 300ms).
- Bấm nút chọn điều kiện bảo quản `[Bảo quản đông]`: Bảng chỉ hiển thị các nguyên liệu/lô hàng thuộc nhóm đông lạnh.
- Bấm nút `[Lô sắp hết hạn]`: Bảng hiển thị danh sách các lô có hạn dùng <= 7 ngày.
- Bấm nút `[Quét Barcode / QR]`: Mở hộp thoại quét mã (hỗ trợ nhập mã quét bằng súng quét mã vạch hoặc camera).

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở không gian làm việc của Thủ kho, **Khi (When)** quan sát Sidebar bên trái, **Thì (Then)** Sidebar cung cấp các nhóm công cụ tác vụ:
   - **Ô tìm kiếm tức thì**: Cho phép gõ tìm theo Mã lô hàng (`BatchCode`), Tên nguyên liệu (`IngredientName`), hoặc Tên nhà cung cấp (`SupplierName`).
   - **Nút tác vụ nhanh `[Quét mã Barcode / QR]`**: Kích hoạt chế độ lắng nghe sự kiện quét từ máy quét chuyên dụng (USB/Bluetooth Barcode Scanner) hoặc mở camera quét mã.
   - **Bộ lọc Điều kiện bảo quản**: Gồm 4 lựa chọn trực quan có icon: `[Tất cả]`, `[Mát / Chilled ❄️]`, `[Đông lạnh / Frozen 🧊]`, `[Khô ráo / Dry 📦]`.
   - **Bộ lọc Trạng thái lô hàng**: `[Tất cả]`, `[Đang sử dụng]`, `[Cận date (<= 7 ngày)]`, `[Đã hết hạn]`, `[Đã khóa tạm ngưng (RM-013)]`.
2. **Cho trước (Given)** một mã vạch được quét thành công từ súng quét, **Khi (When)** hệ thống nhận mã, **Thì (Then)** Sidebar tự động điền mã vào ô tìm kiếm, tự động kích hoạt lọc và cuộn tới chính xác lô hàng tương ứng trên bảng dữ liệu trong vòng dưới 200ms.
3. **Cho trước (Given)** người dùng thay đổi giữa các trang con (từ Dashboard sang Danh mục Lô hoặc Nhật ký Giao dịch), **Khi (When)** điều hướng, **Thì (Then)** `InventoryKeeperSidebarService` tự động cập nhật ngữ cảnh các nút lọc phù hợp cho trang con mà không làm giật lag hay reload layout.

---

### User Story 5 — Tác vụ Nhanh 1 Chạm tại Quầy kho: Nhập kho, Xuất hủy và Khóa/Khôi phục Lô (Priority: P1)

Là một **Thủ kho**, khi nhận hàng mới từ nhà cung cấp hoặc phát hiện một lô hàng bị hỏng trong kho, tôi muốn có các nút bấm tác vụ nhanh 1 chạm (Quick Actions) ngay trên giao diện để mở modal Nhập kho nhanh, Xuất hủy lô quá hạn, hoặc Khóa tạm ngưng lô hàng (RM-013) mà không phải chuyển qua nhiều trang phức tạp.

**Lý do ưu tiên**: Giảm thiểu số bước thao tác khi xử lý hàng hóa thực tế tại cửa kho; hỗ trợ lập tức việc khóa lô cách ly để bếp không lấy nhầm vào chế biến món ăn.

**Kiểm thử Độc lập**:
- Bấm nút `[+ Nhập kho nhanh]` trên thanh tiêu đề bảng -> Mở modal tạo lô hàng mới với đầy đủ thông tin (Nguyên liệu, số lượng, đơn vị chuẩn, ngày sản xuất, hạn sử dụng, giá nhập).
- Bấm nút `[Xuất hủy]` trên dòng của một lô hàng quá hạn -> Mở modal xác nhận xuất hủy kèm lý do và ghi nhận giao dịch hủy.
- Bấm nút `[Tạm khóa lô]` trên dòng của lô nghi ngờ chất lượng -> Mở modal nhập lý do khóa và kích hoạt khóa an toàn theo RM-013.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** danh sách các lô hàng đang hiển thị trên giao diện Thủ kho, **Khi (When)** thủ kho bấm nút `[+ Nhập lô mới]`, **Thì (Then)** hệ thống mở Modal nhập kho nhanh (`CreateInventoryBatchModal`), tự động gợi ý ngày nhập là hôm nay và hỗ trợ chọn nhanh nguyên liệu, nhập số lượng, đơn giá và hạn sử dụng.
2. **Cho trước (Given)** một lô hàng đã hết hạn hoặc bị hư hỏng, **Khi (When)** thủ kho bấm nút `[Xuất hủy]`, **Thì (Then)** hệ thống mở hộp thoại xuất hủy (`DiscardBatchModal`), yêu cầu nhập lý do xuất hủy, xác nhận số lượng hủy và tự động tạo giao dịch biến động loại `DISCARD` trong lịch sử kho.
3. **Cho trước (Given)** một lô hàng cần cách ly kiểm định chất lượng, **Khi (When)** thủ kho bấm nút `[Khóa lô]`, **Thì (Then)** hệ thống kích hoạt modal khóa lô theo chuẩn RM-013, cập nhật trạng thái `IsActive = false`, loại trừ lô khỏi thuật toán xuất kho tự động FEFO của hệ thống POS.
4. **Cho trước (Given)** bất kỳ thao tác thay đổi dữ liệu nào hoàn tất thành công, **Khi (When)** modal đóng lại, **Thì (Then)** các thẻ KPI trên Topbar và danh sách dữ liệu tự động cập nhật ngay lập tức mà không cần reload toàn bộ trang.

---

### User Story 6 — Tương thích Thiết bị Cầm tay (Tablet/Mobile) & Chế độ Drawer Thu gọn (Priority: P2)

Là một **Thủ kho** cầm máy tính bảng hoặc điện thoại đi kiểm kê từng kệ hàng trong kho lạnh, tôi muốn giao diện tự động thích ứng với màn hình nhỏ, các nút bấm to rõ dễ bấm bằng ngón tay đeo găng bảo hộ, và thanh Sidebar có thể thu gọn mượt mà thành ngăn kéo trượt (Offcanvas Drawer) để dành trọn vẹn màn hình cho việc kiểm đếm số lượng.

**Lý do ưu tiên**: Không gian kho hàng chật hẹp, thủ kho thường xuyên phải di chuyển và thao tác bằng 1 tay trên thiết bị di động hoặc máy tính bảng gắn trên xe đẩy hàng.

**Kiểm thử Độc lập**:
- Giả lập màn hình Tablet Portrait (< 992px) hoặc điện thoại di động.
- Kiểm tra Sidebar tự động ẩn; Topbar hiển thị nút `[Bộ lọc & Quét mã]`.
- Chạm vào nút `[Bộ lọc & Quét mã]` -> Drawer trượt ra từ mép trái mượt mà; chạm vào màn hình nền mờ (Backdrop) hoặc nút `[✕]` -> Drawer thu hồi.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng truy cập phân hệ Thủ kho trên thiết bị có độ rộng màn hình < 992px, **Khi (When)** trang hiển thị, **Thì (Then)** Sidebar tự động ẩn khỏi luồng hiển thị chính và Topbar xuất hiện nút `[Bộ lọc & Quét mã]` kèm badge số lượng bộ lọc đang kích hoạt.
2. **Cho trước (Given)** người dùng chạm nút `[Bộ lọc & Quét mã]` trên màn hình cảm ứng, **Khi (When)** thao tác chạm, **Thì (Then)** Sidebar trượt ra dưới dạng Drawer từ cạnh trái (chiều rộng tối đa 340px hoặc 85% màn hình), cho phép thực hiện đầy đủ các chức năng tìm kiếm, quét mã và lọc trạng thái.
3. **Cho trước (Given)** tất cả các nút bấm, icon thao tác (Nhập, Hủy, Khóa, Lọc) trên toàn bộ Layout Thủ kho, **Khi (When)** hiển thị trên màn hình cảm ứng, **Thì (Then)** vùng chạm tối thiểu (touch target) đạt chuẩn 44 × 44 pixel, khoảng cách giữa các nút tối thiểu 8px để không bị bấm nhầm khi ngón tay thao tác nhanh.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Mất kết nối mạng / Mất phiên đăng nhập khi đang đứng trong kho kín**: Khi thủ kho di chuyển vào vùng kho lạnh bị khuất sóng Wi-Fi hoặc phiên làm việc hết hạn, hệ thống hiển thị thông báo nhẹ nhàng dạng toast/banner cảnh báo mất kết nối, giữ nguyên dữ liệu đang nhập dở trên modal và tự động kết nối lại khi có mạng trở lại.
- **EC-002: Quét nhầm mã vạch không tồn tại trong hệ thống**: Khi súng quét nhận diện một mã vạch lạ (không khớp với bất kỳ nguyên liệu hay lô hàng nào), hệ thống rung nhẹ/phát âm thanh cảnh báo lỗi (nếu thiết bị hỗ trợ), hiển thị thông báo *"Không tìm thấy lô hàng tương ứng với mã vừa quét"* và giữ nguyên tiêu điểm ở ô tìm kiếm để sẵn sàng quét lại.
- **EC-003: Tài khoản có nhiều vai trò đồng thời (`Manager` + `InventoryStaff`)**: Khi quản lý kiêm nhiệm thủ kho đăng nhập vào phân hệ `/inventory-keeper`, thanh Topbar luôn hiển thị nút lối tắt `[Quay lại Quản trị]` để họ có thể chuyển đổi tức thì sang Dashboard quản lý chung mà không cần đăng xuất.
- **EC-004: Tự động điều hướng phục hồi khi gặp sự cố (RM-019 Integration)**: Khi tài khoản `InventoryStaff` gặp lỗi 404, 403 hoặc 500 trên bất kỳ trang nào, nút bấm chính `[Quay về trang chính của tôi]` trên trang lỗi RM-019 sẽ tự động đưa họ trở lại `/inventory-keeper/dashboard` sau 5 giây đếm ngược mượt mà.
- **EC-005: Xuất hủy lô hàng đang có liên kết kiểm kê dở dang**: Nếu một lô hàng đang nằm trong biên bản kiểm kê chưa chốt, hệ thống hiển thị hộp thoại cảnh báo bổ sung yêu cầu xác nhận trước khi thực hiện xuất hủy để bảo đảm tính toàn vẹn của số liệu kế toán kho.

---

## 4. Yêu cầu Hệ thống (System Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI thiết lập cụm tuyến đường cơ sở `/inventory-keeper` làm không gian làm việc chuyên biệt độc lập cho Thủ kho.
- **FR-002**: Khi người dùng truy cập vào `/inventory-keeper` (hoặc alias `/keeper`), hệ thống PHẢI tự động chuyển hướng vào tuyến đường con mặc định `/inventory-keeper/dashboard`.
- **FR-003**: Sau khi nhân viên có vai trò `InventoryStaff` đăng nhập thành công qua RM-001, hệ thống PHẢI tự động điều hướng trực tiếp đến `/inventory-keeper/dashboard`.
- **FR-004**: Hệ thống PHẢI xây dựng component bố cục chuyên biệt `InventoryKeeperLayoutComponent` bọc toàn bộ các tuyến đường con thuộc `/inventory-keeper/*`.
- **FR-005**: Bố cục `InventoryKeeperLayoutComponent` PHẢI phân tách thành 3 phân vùng độc lập:
  - **Topbar**: Thanh tiêu đề cố định trên cùng (chiều cao chuẩn 64px).
  - **Sidebar**: Thanh bên trái chuyên dụng cho Tìm kiếm, Quét mã và Bộ lọc (chiều rộng chuẩn 280px).
  - **Main Content**: Không gian trung tâm chứa `<router-outlet>` hiển thị các màn hình con.
- **FR-006**: Thanh Topbar của Inventory Keeper Layout PHẢI hiển thị:
  - Tên/Logo nhà hàng "Acme.TooHungry".
  - Tên thủ kho đăng nhập kèm vai trò `Thủ kho / Inventory Staff`.
  - Huy hiệu Ca trực kho tự động (`[Ca Sáng]`, `[Ca Chiều/Tối]`, `[Ngoài Ca Trực]`).
  - 3 Badge KPI cảnh báo khẩn cấp: Lô cận date (Cam), Thiếu tồn an toàn (Đỏ), Quá hạn cần hủy (Đen).
  - Nút lối tắt `[Quay lại Quản trị]` (chỉ hiển thị có điều kiện cho Manager/Admin).
  - Nút `[Đăng xuất]` nhanh kèm dialog xác nhận.
- **FR-007**: Hệ thống PHẢI xây dựng dịch vụ `InventoryKeeperSidebarService` theo mô hình Service-driven Portal để quản lý động nội dung Sidebar tùy theo trang con đang hiển thị.
- **FR-008**: Thanh Sidebar của phân hệ PHẢI cung cấp:
  - Ô tìm kiếm tức thì theo mã lô, tên nguyên liệu, tên nhà cung cấp (hỗ trợ phím tắt `Ctrl + K` / `Cmd + K`).
  - Nút kích hoạt quét mã Barcode / QR.
  - Bộ lọc 4 trạng thái nhiệt độ bảo quản (Tất cả, Mát, Đông, Khô).
  - Bộ lọc trạng thái hoạt động và hạn sử dụng của lô (Tất cả, Đang dùng, Cận date, Quá hạn, Đã khóa).
- **FR-009**: Hệ thống PHẢI xây dựng bộ gác cổng `inventoryKeeperAuthGuard` bảo vệ toàn bộ cụm tuyến đường `/inventory-keeper/*`, chỉ cho phép tài khoản có vai trò `InventoryStaff`, `Manager` hoặc `Administrator` (có quyền `TooHungry.Inventories`) truy cập.
- **FR-010**: Hệ thống PHẢI cung cấp màn hình Tổng quan kho `/inventory-keeper/dashboard` hiển thị các thẻ Bento Card KPI tài chính & số lượng tồn, danh sách các lô hàng cận date cần ưu tiên xuất trước theo FEFO.
- **FR-011**: Hệ thống PHẢI cung cấp màn hình Danh mục Lô hàng `/inventory-keeper/batches` cho phép thao tác 1 chạm: Nhập lô mới, Xuất hủy lô, Tạm khóa / Mở khóa lô (RM-013).
- **FR-012**: Hệ thống PHẢI cung cấp màn hình Nhật ký & Kiểm kê `/inventory-keeper/transactions` tra cứu lịch sử xuất nhập tồn bất biến và thực hiện cân đối kiểm kê kho (RM-011).
- **FR-013**: Trên màn hình có độ rộng < 992px, Sidebar PHẢI tự động chuyển đổi thành Drawer trượt (Offcanvas) từ mép trái, đóng/mở mượt mà khi tương tác nút `[Bộ lọc & Quét mã]`.
- **FR-014**: Hệ thống PHẢI tích hợp đồng bộ với `UserRoleNavigationService` và bộ trang báo lỗi RM-019 để tự động phục hồi người dùng về `/inventory-keeper/dashboard`.
- **FR-015**: 100% văn bản, nhãn nút, tiêu đề, thông điệp hướng dẫn và thông báo lỗi PHẢI được cấu hình song ngữ trong `vi.json` và `en.json`.

### Yêu cầu Phi chức năng (Non-Functional Requirements)

- **NFR-001 (Hiệu năng)**: Thời gian chuyển đổi giữa các tab con trong phân hệ và thời gian phản hồi tìm kiếm/lọc kho không vượt quá 150ms.
- **NFR-002 (Khả năng tương thích cảm ứng)**: Toàn bộ nút bấm và phần tử tương tác trên thiết bị cảm ứng phải đạt kích thước tối thiểu 44 × 44 pixel.
- **NFR-003 (Bảo mật)**: Chặn đứng mọi nỗ lực truy cập trái phép vào số liệu kho từ các vai trò không liên quan; không để lộ thông tin giá vốn nguyên liệu cho các tài khoản không có quyền.
- **NFR-004 (Thẩm mỹ & Visual)**: Tuân thủ chuẩn nhận diện Cam & Trắng (`#EA580C`), phong cách Bento Card bo góc lớn `rounded-2xl`, hiệu ứng chuyển động mượt mà (smooth transition 200ms).
- **NFR-005 (Độ tin cậy)**: Dữ liệu cảnh báo hạn dùng và tồn kho an toàn phải được tính toán chính xác tuyệt đối theo múi giờ địa phương của nhà hàng.
- **NFR-006 (Không phá vỡ kiến trúc)**: Tái sử dụng tối đa các API và Modal nghiệp vụ từ RM-011, RM-012, RM-013 mà không làm phát sinh nợ kỹ thuật backend.

---

## 5. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

- **SC-001**: 100% tài khoản có vai trò `InventoryStaff` được tự động điều hướng vào `/inventory-keeper/dashboard` sau khi đăng nhập thành công qua RM-001.
- **SC-002**: 100% các tuyến đường thuộc `/inventory-keeper/*` được bảo vệ tuyệt đối bởi `inventoryKeeperAuthGuard`; các tài khoản không hợp lệ bị từ chối 100% và chuyển hướng an toàn.
- **SC-003**: Bố cục 3 phân vùng (Topbar, Sidebar, Main Content) hiển thị chuẩn xác, không có bất kỳ thanh menu ABP admin nào xuất hiện trong phân hệ.
- **SC-004**: Ca trực kho và 3 thẻ KPI cảnh báo nhanh trên Topbar hiển thị chính xác theo thời gian thực và tự động cập nhật khi có biến động kho.
- **SC-005**: Tính năng tìm kiếm mã lô / nguyên liệu và bộ lọc nhiệt độ/trạng thái hoạt động tức thì với thời gian phản hồi dưới 150ms.
- **SC-006**: Trải nghiệm Drawer Offcanvas trên thiết bị di động / máy tính bảng (< 992px) hoạt động mượt mà, đạt 100% tiêu chuẩn kích thước chạm ngón tay >= 44×44px.
- **SC-007**: 100% các chuỗi văn bản trên toàn bộ phân hệ được bản dịch hóa song ngữ đầy đủ trong `vi.json` và `en.json`.
