# Đặc tả Tính năng (Feature Specification): Điều hướng & Bố cục Waiter (Waiter Routing & Layout)

**Mã Tính năng (Feature ID)**: `RM-015`

**Nhánh Tính năng (Feature Branch)**: `015-rm-015-waiter-routing-and-layout`

**Ngày cập nhật**: 2026-10-12

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**: Yêu cầu nghiệp vụ từ Roadmap RM-015: "Thiết lập cơ chế điều hướng dựa trên vai trò (Role-based routing) cho nhân viên phục vụ (`Waiter`) và xây dựng bộ Layout giao diện chuyên biệt cho phân hệ Waiter."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 12-10-2026 (Phiên làm rõ Yêu cầu & Quyết định Kiến trúc)
- **Q1: Kiến trúc quản lý nội dung Sidebar ngữ cảnh động (Dynamic Contextual Sidebar)**: Giữa màn hình Danh sách bàn (`/waiter/tables` - lọc khu vực, trạng thái) và màn hình Gọi món (`/waiter/order/:tableId` - thẻ thông tin bàn, danh mục món), Sidebar nên được quản lý qua cơ chế nào?
  - **A1**: **Áp dụng Service-driven Portal/Template Pattern**: `WaiterLayoutComponent` cung cấp slot `<ng-container *ngTemplateOutlet="..."></ng-container>` tại vùng Sidebar. Xây dựng dịch vụ `WaiterSidebarService` cho phép từng trang con (`WaiterTablesComponent`, `WaiterOrderComponent`) đăng ký `TemplateRef` nội dung của mình khi khởi tạo (`ngOnInit`) và tự động giải phóng/thu hồi khi rời trang (`ngOnDestroy`). Cách làm này đảm bảo tính đóng gói cao, các trang con toàn quyền quản lý dữ liệu lọc và tương tác mà không làm vỡ kiến trúc layout chung.
- **Q2: Quyền truy cập và Lối tắt quay lại Quản trị (Admin Portal Link)**: Khi tài khoản có vai trò Quản lý (`Manager`) hoặc Quản trị viên (`Administrator`) truy cập vào phân hệ Waiter, thanh Topbar nên hiển thị như thế nào?
  - **A2**: **Hiển thị nút lối tắt `[Quay lại Quản trị]` ở góc phải Topbar**: Chỉ hiển thị có điều kiện khi người dùng hiện tại sở hữu vai trò `Manager` hoặc `Administrator` (kiểm tra qua `ConfigStateService.currentUser.roles`). Khi bấm, hệ thống chuyển hướng ngay lập tức về trang tổng quan quản trị (`/`), giúp cấp quản lý kiểm tra bàn/order rồi quay lại quản trị nhanh chóng mà không cần đăng xuất. Đối với tài khoản thuần `Waiter`, nút này bị ẩn hoàn toàn để giữ giao diện tối giản.
- **Q3: Thông tin ca trực (Shift Info) và nhân viên trên thanh Topbar**: Thông tin ca trực và nhân viên trên Topbar nên được xác định và hiển thị theo phương thức nào?
  - **A3**: **Tự động xác định Ca trực theo giờ hệ thống kết hợp thông tin nhân viên**: Topbar hiển thị Tên nhân viên + Vai trò "Nhân viên phục vụ" kèm badge Ca trực được tính toán tự động dựa trên đồng hồ thực tế khớp với khung giờ hoạt động nhà hàng (09:00 - 23:00):
    - *Ca sáng*: `09:00 - 15:00` (Hiển thị badge `[Ca Sáng]`)
    - *Ca tối*: `15:00 - 23:00` (Hiển thị badge `[Ca Tối]`)
    - *Ngoài giờ phục vụ*: `23:00 - 09:00` (Hiển thị badge `[Ngoài ca trực]`).
- **Q4: Tích hợp với màn hình Thanh toán đơn hàng (RM-016)**: Theo roadmap RM-016, màn hình thanh toán yêu cầu "KHÔNG sử dụng Sidebar và Topbar thông thường của Waiter layout"; kiến trúc routing nên xử lý như thế nào?
  - **A4**: **Định tuyến độc lập cấp App (Standalone Layout)**: Tuyến đường thanh toán được cấu hình độc lập tại `/payment/:orderId` (và route alias `/waiter/payment/:orderId` redirect về `/payment/:orderId`), sử dụng layout toàn màn hình riêng biệt (Standalone Component / Empty Layout), hoàn toàn nằm ngoài `WaiterLayoutComponent`. Nhờ đó, màn hình thanh toán đạt chuẩn 60% hóa đơn : 40% phương thức thanh toán mà không bị chi phối bởi Topbar hay Sidebar của Waiter.
- **Q5: Trải nghiệm thu gọn (Offcanvas/Drawer) trên Máy tính bảng & Màn hình cảm ứng (< 992px)**: Khi độ phân giải màn hình nhỏ hoặc xoay dọc (Portrait), Sidebar hoạt động theo hình thức nào?
  - **A5**: **Tự động chuyển đổi thành Drawer/Offcanvas trượt từ mép trái**: Trên màn hình < 992px, Sidebar ẩn khỏi dòng layout chính; thanh Topbar xuất hiện nút bấm mở bộ lọc `[Bộ lọc]` có badge số lượng tiêu chí đang chọn. Khi chạm nút, Sidebar trượt ra dạng Offcanvas mượt mà che phủ 80% chiều rộng màn hình (tối đa 360px), hỗ trợ chạm nền mờ (Backdrop) hoặc nút đóng `[✕]` để thu hồi, đáp ứng chuẩn touch target >= 44×44px cho ngón tay.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Phân hệ Nhân viên phục vụ (`Waiter`) là tuyến đầu trong chuỗi vận hành nhà hàng tại chỗ của Acme.TooHungry. Khác với người quản trị văn phòng cần xem báo cáo số liệu và cấu hình hệ thống, nhân viên phục vụ đòi hỏi tốc độ thao tác cực nhanh, giao diện tập trung cao độ, màn hình cảm ứng thân thiện và không bị phân tâm bởi các thanh điều hướng cồng kềnh.

**RM-015 (Điều hướng & Bố cục Waiter)** đóng vai trò là "khung xương sống" (Application Shell & Layout Architecture) cho toàn bộ phân hệ phục vụ, thiết lập:
1. **Cơ chế điều hướng theo vai trò (Role-based Routing)**: Sau khi nhân viên Waiter đăng nhập qua RM-001, hệ thống lập tức chuyển hướng trực tiếp vào màn hình tác nghiệp mặc định `/waiter/tables`.
2. **Bộ gác cổng bảo vệ phân hệ (`waiterAuthGuard`)**: Bảo vệ toàn bộ cụm tuyến đường `/waiter/*`, ngăn chặn truy cập trái phép và định tuyến thông minh dựa trên vai trò (`Waiter`, `Manager`, `Administrator`).
3. **Bộ Layout Waiter chuyên biệt (3 khu vực chức năng)**:
   - **Topbar**: Tối giản, hiển thị tên nhà hàng ("Acme.TooHungry"), thông tin nhân viên ca trực tự động theo giờ, trạng thái kết nối trực tuyến (SignalR), nút lối tắt quay lại quản trị (dành cho Admin/Manager) và nút đăng xuất an toàn.
   - **Sidebar Ngữ cảnh Động (Dynamic Contextual Sidebar)**: Vùng dành riêng cho Tìm kiếm và Bộ lọc (Search & Filters), hoạt động theo mô hình Service-driven Portal (`WaiterSidebarService`), tự động biến đổi linh hoạt nội dung tùy thuộc vào trang con đang hiển thị (ví dụ: lọc bàn theo khu vực/trạng thái ở trang bàn; hiển thị Thẻ thông tin bàn và lọc danh mục món ở trang gọi món).
   - **Main Content**: Không gian trung tâm tối ưu hiển thị danh sách thẻ bàn, thực đơn gọi món với trải nghiệm cuộn độc lập và hỗ trợ cảm ứng (touch-friendly).

### Vị trí trong Chuỗi Vận hành Nhà hàng:
```text
Authentication (RM-001)
       │
       ▼
Waiter Routing & Layout (RM-015) ───► Khung Layout & Gác cổng phân hệ Waiter
       │
       ▼
Table Management (RM-008) ──────────► Sơ đồ bàn (/waiter/tables)
       │
       ├── Đặt bàn trước (RM-009)
       └── Đón khách (AVAILABLE → OCCUPIED)
              │
              ▼
       POS / Gọi món (RM-010) ──────► Gọi món tại bàn (/waiter/order/:tableId)
              │
              ▼
       Thanh toán (RM-016) ─────────► Standalone Layout (/payment/:orderId)
```

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

### User Story 1 - Tự động Điều hướng theo Vai trò sau Đăng nhập (Priority: P1)

Là một Nhân viên phục vụ (Waiter), sau khi tôi đăng nhập thành công vào hệ thống bằng tài khoản của mình qua RM-001, tôi muốn hệ thống tự động đưa tôi thẳng vào màn hình Danh sách bàn ăn (`/waiter/tables`) mà không phải bấm chọn qua bất kỳ menu trung gian nào, để tôi có thể bắt đầu ca làm việc ngay lập tức.

**Lý do cho mức độ ưu tiên này**: Nhân viên phục vụ làm việc trong môi trường nhà hàng bận rộn; việc điều hướng thẳng vào màn hình nghiệp vụ chính giúp tiết kiệm thời gian, giảm thao tác thừa và tránh việc nhân viên đi lạc vào các khu vực quản trị khác.

**Kiểm thử Độc lập**: Đăng nhập bằng tài khoản có vai trò `Waiter`. Kiểm tra URL sau đăng nhập tự động chuyển về `/waiter/tables`. Kiểm tra giao diện hiển thị ngay sơ đồ bàn mà không hiển thị dashboard quản trị.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên có vai trò `Waiter` đang ở màn hình Đăng nhập (RM-001), **Khi (When)** nhân viên xác thực thành công, **Thì (Then)** hệ thống tự động điều hướng trực tiếp đến đường dẫn `/waiter/tables`.
2. **Cho trước (Given)** người dùng đã đăng nhập với vai trò `Waiter`, **Khi (When)** người dùng truy cập vào URL gốc `/waiter` hoặc `/`, **Thì (Then)** hệ thống tự động chuyển hướng người dùng đến `/waiter/tables`.
3. **Cho trước (Given)** người dùng đã đăng nhập với vai trò `Waiter`, **Khi (When)** người dùng cố tình truy cập vào các đường dẫn quản trị bị giới hạn (ví dụ `/identity/users`, `/dishes`, `/inventory`), **Thì (Then)** bộ gác cổng từ chối quyền truy cập (403 Forbidden) và chuyển hướng giữ người dùng trong không gian làm việc an toàn của Waiter (`/waiter/tables`).

---

### User Story 2 - Cấu trúc Bố cục Giao diện Waiter Chuyên biệt 3 Vùng (Priority: P1)

Là một Nhân viên phục vụ, tôi muốn làm việc trên một giao diện chuyên biệt gồm 3 phân vùng rõ ràng (Topbar ở trên cùng, Sidebar tìm kiếm/bộ lọc ở bên trái, và Main Content ở giữa), được thiết kế tối giản, sạch sẽ, không có thanh menu quản trị cồng kềnh của hệ thống chung, giúp tôi tập trung hoàn toàn vào việc phục vụ khách.

**Lý do cho mức độ ưu tiên này**: Bố cục chuyên biệt là nền tảng để hiển thị toàn bộ các tính năng vận hành bàn (RM-008) và gọi món (RM-010). Nếu bố cục không chuẩn mực, trải nghiệm của Waiter sẽ bị phân mảnh và giảm hiệu suất phục vụ.

**Kiểm thử Độc lập**: Truy cập `/waiter/tables`. Quan sát màn hình được phân chia đúng 3 khu vực: Topbar trên cùng có logo nhà hàng và thông tin ca trực; Sidebar bên trái chứa công cụ tìm kiếm và bộ lọc; Main Content hiển thị lưới thẻ bàn ăn.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở bất kỳ trang nào thuộc phân hệ `/waiter/*`, **Khi (When)** giao diện hiển thị, **Thì (Then)** bố cục màn hình bắt buộc tuân thủ cấu trúc 3 khu vực:
   - **Topbar**: Chiều cao chuẩn 64px, cố định trên cùng, chứa tên thương hiệu "Acme.TooHungry", thông tin nhân viên, badge ca trực tự động, trạng thái kết nối mạng và các nút tác vụ.
   - **Sidebar**: Nằm ở cạnh trái (chiều rộng cố định 280px trên desktop), dành riêng cho các tác vụ Tìm kiếm & Bộ lọc (Search/Filter), tách biệt khỏi menu điều hướng hệ thống.
   - **Main Content**: Nằm ở trung tâm, hiển thị nội dung chính của trang con qua `<router-outlet>`.
2. **Cho trước (Given)** bố cục phân hệ Waiter đang hiển thị, **Khi (When)** quan sát toàn bộ trang, **Thì (Then)** hệ thống KHÔNG hiển thị thanh menu điều hướng quản trị thông thường của ABP Framework (ẩn các menu Master Data, Identity, Cài đặt).
3. **Cho trước (Given)** thanh Topbar của Waiter layout, **Khi (When)** nhân viên quan sát thông tin góc trên bên phải, **Thì (Then)** hiển thị rõ ràng: Tên nhân viên đăng nhập, vai trò `Waiter`, huy hiệu ca trực (`[Ca Sáng]` hoặc `[Ca Tối]` hoặc `[Ngoài ca trực]`), trạng thái kết nối thời gian thực (Online badge xanh lá), và nút `[Đăng xuất]` nhanh kèm hộp thoại xác nhận.
4. **Cho trước (Given)** người dùng đăng nhập là Quản lý (`Manager`) hoặc Quản trị viên (`Administrator`) truy cập vào phân hệ Waiter, **Khi (When)** Topbar hiển thị, **Thì (Then)** hiển thị thêm nút lối tắt `[Quay lại Quản trị]` nổi bật với icon `fa-arrow-left` ở góc phải, cho phép 1 chạm quay về giao diện Dashboard quản trị (`/`).

---

### User Story 3 - Bộ Gác cổng Tuyến đường (Waiter Auth Guard & Access Control) (Priority: P1)

Là Hệ thống bảo mật, tôi muốn kiểm soát chặt chẽ toàn bộ cụm tuyến đường `/waiter/*` thông qua bộ gác cổng chuyên trách (`waiterAuthGuard`), đảm bảo chỉ những tài khoản đã đăng nhập và sở hữu vai trò hoặc quyền phục vụ phù hợp mới được phép truy cập.

**Lý do cho mức độ ưu tiên này**: Đảm bảo an toàn thông tin nghiệp vụ vận hành bàn ăn và đơn hàng, ngăn chặn việc người chưa đăng nhập hoặc tài khoản không đúng thẩm quyền xem được dữ liệu khách hàng tại bàn.

**Kiểm thử Độc lập**: Dùng trình duyệt ẩn danh (chưa đăng nhập) truy cập `/waiter/tables` -> bị chuyển về trang đăng nhập kèm tham số returnUrl. Đăng nhập bằng tài khoản không có quyền phục vụ (ví dụ chỉ có quyền kho `InventoryStaff`) -> bị từ chối truy cập và chuyển về trang tương ứng với vai trò của họ.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng chưa đăng nhập vào hệ thống, **Khi (When)** người dùng cố gắng truy cập bất kỳ URL nào thuộc `/waiter/*`, **Thì (Then)** bộ gác cổng chặn truy cập và chuyển hướng người dùng về màn hình đăng nhập (`/account/login`), đồng thời lưu lại URL đích để tự động quay lại sau khi đăng nhập thành công.
2. **Cho trước (Given)** người dùng đã đăng nhập với vai trò `Waiter`, `Manager`, hoặc `Administrator`, **Khi (When)** truy cập vào `/waiter/*`, **Thì (Then)** bộ gác cổng cho phép truy cập thành công vào phân hệ.
3. **Cho trước (Given)** người dùng đã đăng nhập nhưng không có vai trò hoặc quyền hạn liên quan đến phục vụ bàn (ví dụ `InventoryStaff`), **Khi (When)** cố gắng truy cập `/waiter/*`, **Thì (Then)** bộ gác cổng từ chối truy cập (403 Forbidden), hiển thị thông báo lỗi phù hợp và điều hướng về màn hình mặc định của vai trò đó (ví dụ `/inventory`).

---

### User Story 4 - Sidebar Ngữ cảnh Động qua Cơ chế Service-driven Portal (Priority: P1)

Là một Nhân viên phục vụ, khi tôi chuyển đổi giữa các màn hình khác nhau trong phân hệ Waiter (từ Danh sách bàn sang Gọi món tại bàn), tôi muốn nội dung Sidebar bên trái tự động thích ứng với ngữ cảnh nghiệp vụ của màn hình đó để cung cấp công cụ lọc và thông tin hỗ trợ phù hợp nhất mà không làm reload layout.

**Lý do cho mức độ ưu tiên này**: Tối ưu hóa diện tích hiển thị và tính tiện dụng của thanh bên, biến thanh bên thành trợ thủ đắc lực theo từng bước phục vụ thay vì một menu tĩnh vô dụng.

**Kiểm thử Độc lập**:
- Tại `/waiter/tables`: Sidebar hiển thị ô tìm kiếm bàn, bộ lọc khu vực ăn uống (Dining Area) và bộ lọc trạng thái bàn.
- Tại `/waiter/order/:tableId`: Sidebar tự động chuyển sang hiển thị Thẻ thông tin bàn ăn (Table Info Card) và danh mục món ăn (Menu Categories) để lọc món.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** nhân viên đang ở màn hình Danh sách bàn (`/waiter/tables`), **Khi (When)** `WaiterTablesComponent` khởi tạo, **Thì (Then)** component đăng ký Template lọc bàn vào `WaiterSidebarService`, Sidebar bên trái lập tức hiển thị:
   - Ô tìm kiếm bàn nhanh theo tên/số hiệu.
   - Bộ chọn lọc theo Khu vực ăn uống (Tất cả khu vực, Tầng 1, Tầng 2, Ngoài trời...).
   - Bộ chọn lọc theo Trạng thái bàn (Còn trống, Đang có khách, Đã đặt, Đang dọn dẹp, Vô hiệu hóa).
2. **Cho trước (Given)** nhân viên chuyển hướng sang màn hình Gọi món (`/waiter/order/:tableId`), **Khi (When)** `WaiterOrderComponent` khởi tạo, **Thì (Then)** component đăng ký Template gọi món vào `WaiterSidebarService`, Sidebar bên trái tự động cập nhật:
   - Thẻ thông tin bàn ăn (Tên bàn, Sức chứa, Trạng thái phiên ăn).
   - Danh sách Danh mục món ăn (Menu Categories) mở rộng sẵn để lọc nhanh danh sách món trên lưới thực đơn.
3. **Cho trước (Given)** nhân viên bấm nút quay lại `[← Back]` từ trang gọi món về trang danh sách bàn, **Khi (When)** điều hướng hoàn tất, **Thì (Then)** `WaiterOrderComponent` hủy đăng ký, `WaiterTablesComponent` đăng ký lại template của mình, Sidebar khôi phục lại tức thì bộ lọc tìm kiếm bàn mà không bị giật lag hay mất trạng thái lọc trước đó.

---

### User Story 5 - Khả năng Tương thích Thiết bị Cảm ứng & Thu gọn Dạng Drawer (Responsive Offcanvas) (Priority: P2)

Là một Nhân viên phục vụ sử dụng máy tính bảng (iPad / Tablet) cầm tay đi lại giữa các bàn, tôi muốn giao diện Waiter hiển thị vừa vặn, các nút bấm to rõ dễ chạm bằng ngón tay, và thanh Sidebar có thể thu gọn mượt mà thành ngăn kéo trượt (Offcanvas Drawer) khi xoay dọc máy tính bảng để ưu tiên tối đa diện tích cho sơ đồ bàn và thực đơn.

**Lý do cho mức độ ưu tiên này**: Nhân viên phục vụ phần lớn thao tác trên thiết bị di động/máy tính bảng cầm tay; giao diện phải tối ưu cho thao tác cảm ứng một chạm (touch-first) để tăng tốc độ ghi nhận thông tin.

**Kiểm thử Độc lập**: Thu nhỏ kích thước màn hình hoặc mở chế độ giả lập Tablet Portrait (< 992px). Kiểm tra Sidebar tự động thu gọn; Topbar hiển thị nút `[Bộ lọc]`; chạm vào nút `[Bộ lọc]` -> Sidebar trượt ra dạng Drawer từ mép trái với hiệu ứng mượt mà; chạm vào lớp nền mờ (Backdrop) hoặc nút đóng `[✕]` -> Drawer tự động thu hồi.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:
1. **Cho trước (Given)** người dùng truy cập phân hệ Waiter trên màn hình có độ rộng >= 992px (Desktop / Tablet Landscape), **Khi (When)** trang hiển thị, **Thì (Then)** Sidebar hiển thị cố định ở cột bên trái (chiều rộng 280px) và Main Content chiếm không gian còn lại.
2. **Cho trước (Given)** người dùng truy cập trên màn hình có độ rộng < 992px (Tablet Portrait / Mobile), **Khi (When)** trang hiển thị, **Thì (Then)** Sidebar tự động ẩn khỏi dòng layout và thanh Topbar xuất hiện nút bấm `[Bộ lọc]` (kèm badge hiển thị số lượng tiêu chí lọc đang áp dụng).
3. **Cho trước (Given)** người dùng bấm nút `[Bộ lọc]` trên màn hình nhỏ, **Khi (When)** thao tác chạm, **Thì (Then)** Sidebar trượt ra dưới dạng Drawer (Offcanvas) từ cạnh trái che phủ tối đa 360px (hoặc 85% màn hình di động), cho phép thao tác lọc đầy đủ và tự động đóng khi áp dụng hoặc chạm vào vùng nền mờ bên ngoài.
4. **Cho trước (Given)** tất cả các nút bấm và phần tử tương tác trên toàn bộ Layout Waiter (nút Back, nút Bộ lọc, nút Đăng xuất, các Tab lọc, nút Quay lại quản trị), **Khi (When)** hiển thị, **Thì (Then)** kích thước vùng chạm (touch target) đạt tối thiểu 44 × 44 pixel để đảm bảo chạm ngón tay chính xác, không bấm nhầm.

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Mất phiên đăng nhập (Session Expiration) khi đang thao tác phục vụ**: Khi token hết hạn hoặc nhân viên bị đăng xuất trên thiết bị khác trong lúc đang đứng tại bàn khách, hệ thống hiển thị thông báo nhẹ nhàng và chuyển hướng an toàn về màn hình đăng nhập, lưu lại URL hiện tại (`returnUrl`) để nhân viên đăng nhập lại và tiếp tục công việc ngay lập tức mà không làm mất bối cảnh bàn đang chọn.
- **EC-002: Truy cập đường dẫn không tồn tại trong cụm Waiter (404 Not Found trong `/waiter/*`)**: Nếu người dùng gõ nhầm một route con không hợp lệ (ví dụ `/waiter/xyz`), hệ thống tự động nhận diện và chuyển hướng về tuyến đường mặc định `/waiter/tables` thay vì hiển thị trang lỗi 404 trống rỗng.
- **EC-003: Xoay thiết bị đột ngột giữa chừng (Orientation Change)**: Khi nhân viên xoay máy tính bảng từ ngang sang dọc hoặc ngược lại, Layout tự động tính toán lại tỷ lệ co giãn (flexbox/grid) trong thời gian dưới 100ms, tự động đóng Drawer nếu mở rộng sang chế độ desktop, không làm tải lại trang và không làm mất dữ liệu giỏ hàng hoặc bộ lọc đang chọn.
- **EC-004: Màn hình Thanh toán độc lập (RM-016)**: Khi chuyển sang màn hình Thanh toán (`/payment/:orderId` hoặc alias `/waiter/payment/:orderId`), hệ thống định tuyến sang Standalone View toàn màn hình (ẩn hoàn toàn Topbar và Sidebar của Waiter Layout) theo đúng đặc tả của RM-016, chỉ giữ lại nút quay về danh sách bàn.
- **EC-005: Đồng bộ quyền người dùng đa vai trò (Multi-role account)**: Trường hợp tài khoản vừa có vai trò `Manager` vừa có vai trò `Waiter`, Topbar luôn hiển thị nút `[Quay lại Quản trị]` để cho phép chuyển đổi tức thì giữa chế độ phục vụ bàn và quản lý nhà hàng mà không bị xung đột phân quyền.

---

## 4. Yêu cầu Hệ thống (Requirements) *(bắt buộc)*

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI thiết lập tuyến đường cơ sở `/waiter` làm không gian làm việc chuyên biệt cho phân hệ Nhân viên phục vụ.
- **FR-002**: Khi người dùng truy cập vào tuyến đường cơ sở `/waiter` (hoặc `/waiter/`), hệ thống PHẢI tự động chuyển hướng (redirect) vào tuyến đường con mặc định `/waiter/tables`.
- **FR-003**: Sau khi nhân viên có vai trò `Waiter` đăng nhập thành công qua RM-001, hệ thống PHẢI tự động điều hướng trực tiếp đến `/waiter/tables`.
- **FR-004**: Hệ thống PHẢI xây dựng component bố cục chuyên biệt `WaiterLayoutComponent` bao bọc toàn bộ các tuyến đường con thuộc `/waiter/*`.
- **FR-005**: Bố cục `WaiterLayoutComponent` PHẢI phân tách thành đúng 3 khu vực chức năng:
  - **Topbar**: Thanh tiêu đề trên cùng (chiều cao chuẩn 64px).
  - **Sidebar**: Thanh bên trái chuyên dụng cho Tìm kiếm và Bộ lọc (chiều rộng 280px).
  - **Main Content**: Không gian trung tâm chứa `<router-outlet>` để render các màn hình con.
- **FR-006**: Thanh Topbar của Waiter Layout PHẢI hiển thị:
  - Tên/Logo nhà hàng ("Acme.TooHungry").
  - Thông tin người dùng hiện tại (Tên hiển thị, Vai trò `Waiter`).
  - Huy hiệu Ca trực tự động tính theo giờ thực tế: `[Ca Sáng]` (09:00 - 15:00), `[Ca Tối]` (15:00 - 23:00), `[Ngoài ca trực]` (23:00 - 09:00).
  - Huy hiệu trạng thái kết nối trực tuyến (Online / Realtime SignalR status).
  - Nút Đăng xuất an toàn kèm hộp thoại xác nhận.
- **FR-007**: Khi người dùng hiện tại sở hữu vai trò `Manager` hoặc `Administrator`, thanh Topbar PHẢI hiển thị thêm nút lối tắt `[Quay lại Quản trị]` ở góc phải để chuyển về màn hình quản trị chính (`/`). Nút này PHẢI bị ẩn đối với tài khoản thuần `Waiter`.
- **FR-008**: Hệ thống PHẢI ẩn hoàn toàn thanh điều hướng quản trị mặc định của ABP Framework khi người dùng đang ở trong phân hệ `/waiter/*`.
- **FR-009**: Hệ thống PHẢI xây dựng dịch vụ `WaiterSidebarService` quản lý cơ chế cắm ghép Sidebar theo mô hình Service-driven Portal:
  - Cho phép các màn hình con đăng ký `TemplateRef` nội dung bộ lọc của mình.
  - Tự động hiển thị template tương ứng tại vùng Sidebar của `WaiterLayoutComponent`.
  - Tự động thu hồi/giải phóng template khi màn hình con bị hủy (`ngOnDestroy`).
- **FR-010**: Màn hình Danh sách bàn (`/waiter/tables`) PHẢI đăng ký nội dung Sidebar gồm: Ô tìm kiếm bàn, bộ lọc khu vực ăn uống và bộ lọc trạng thái bàn.
- **FR-011**: Màn hình Gọi món (`/waiter/order/:tableId`) PHẢI đăng ký nội dung Sidebar gồm: Thẻ thông tin bàn ăn (Table Info Card) và bộ lọc danh mục món ăn (Menu Categories).
- **FR-012**: Hệ thống PHẢI cung cấp bộ gác cổng tuyến đường (`waiterAuthGuard` / Angular `CanActivateFn`):
  - Chặn người dùng chưa đăng nhập và chuyển hướng về màn hình đăng nhập với tham số `returnUrl`.
  - Cho phép người dùng có vai trò `Waiter`, `Manager`, hoặc `Administrator` truy cập.
  - Từ chối và chuyển hướng về trang tương ứng kèm cảnh báo 403 Forbidden đối với người dùng không có thẩm quyền (như `InventoryStaff`).
- **FR-013**: Trên màn hình kích thước nhỏ (< 992px), hệ thống PHẢI tự động chuyển đổi Sidebar sang dạng ngăn kéo trượt (Offcanvas/Drawer) mở qua nút `[Bộ lọc]` trên Topbar, hỗ trợ đóng khi chạm backdrop hoặc nút đóng `[✕]`.
- **FR-014**: Tuyến đường Thanh toán đơn hàng RM-016 PHẢI được định tuyến độc lập tại `/payment/:orderId` (hoặc alias `/waiter/payment/:orderId` chuyển tiếp về `/payment/:orderId`), sử dụng chế độ Standalone Layout toàn màn hình, hoàn toàn không kế thừa Topbar và Sidebar của Waiter Layout.
- **FR-015**: Toàn bộ các phần tử tương tác trên Layout PHẢI đạt kích thước vùng chạm tối thiểu 44 × 44 pixel để tối ưu hóa cho thao tác chạm cảm ứng.
- **FR-016**: Layout PHẢI tuân thủ bảng màu nhận diện thương hiệu Cam & Trắng đặc trưng của Acme.TooHungry (màu chủ đạo `#EA580C`, màu nền `#F8FAFC`, thẻ màu trắng `#FFFFFF` bo góc chuẩn mực).
- **FR-017**: 100% các chuỗi văn bản hiển thị trên Layout (tiêu đề, nhãn nút, ca trực, tooltip, thông báo xác nhận) PHẢI hỗ trợ đa ngôn ngữ đầy đủ trong `vi.json` và `en.json`.
- **FR-018**: Khi người dùng truy cập vào một URL con không tồn tại bên trong `/waiter/*`, hệ thống PHẢI tự động điều hướng về `/waiter/tables`.

---

### Yêu cầu Phi chức năng & Hiệu năng (Non-Functional Requirements)

- **NFR-001 (Thời gian phản hồi Bố cục)**: Thời gian khởi tạo và render toàn bộ `WaiterLayoutComponent` không vượt quá 200 mili-giây trên các thiết bị máy tính bảng tiêu chuẩn.
- **NFR-002 (Độ mượt mà của Hiệu ứng Drawer)**: Chuyển động trượt mở/đóng ngăn kéo Sidebar trên thiết bị di động phải đạt tốc độ 60 khung hình/giây (fps), thời gian trượt hoàn tất trong 250ms không gây giật màn hình.
- **NFR-003 (Bảo mật Phân quyền hai lớp)**: Cơ chế kiểm soát quyền truy cập phải được đảm bảo cả ở tầng giao diện (Angular Guard) và tầng máy chủ (ABP Authorization Policies).
- **NFR-004 (Chuẩn thiết kế Cảm ứng)**: Tất cả khoảng cách giữa các phần tử có thể bấm chạm tối thiểu là 8 pixel để chống bấm nhầm ngón tay.
- **NFR-005 (Độ tương thích Trình duyệt)**: Layout hoạt động hoàn hảo trên Safari Mobile (iPadOS), Google Chrome trên Android/Windows và Microsoft Edge.

---

## 5. Các Thực thể & Giao diện Chính (Key Entities & Interfaces)

Do RM-015 là tính năng thuộc tầng Bố cục Giao diện & Điều hướng (UI Architecture & Client Routing), không phát sinh bảng cơ sở dữ liệu riêng, các giao diện dữ liệu chính bao gồm:

### Giao diện Trạng thái Người dùng & Ca trực (Waiter Layout State Model)
```typescript
export interface WaiterUserInfo {
  userId: string;
  userName: string;
  fullName: string;
  roles: string[];
  shiftName: 'MorningShift' | 'EveningShift' | 'OffShift';
  shiftDisplay: string;
  isOnline: boolean;
  canReturnToAdmin: boolean;
}
```

### Giao diện Dịch vụ Sidebar Ngữ cảnh (WaiterSidebarService)
```typescript
@Injectable({ providedIn: 'root' })
export class WaiterSidebarService {
  readonly sidebarTemplate = signal<TemplateRef<any> | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeFilterCount = signal<number>(0);

  registerTemplate(template: TemplateRef<any>, filterCount = 0): void;
  clearTemplate(): void;
  openDrawer(): void;
  closeDrawer(): void;
  toggleDrawer(): void;
  setFilterCount(count: number): void;
}
```

### Cấu trúc Phân nhánh Định tuyến Waiter (Angular Routing Structure)
```typescript
export const WAITER_ROUTES: Routes = [
  {
    path: 'waiter',
    component: WaiterLayoutComponent,
    canActivate: [authGuard, waiterAuthGuard],
    children: [
      { path: '', redirectTo: 'tables', pathMatch: 'full' },
      {
        path: 'tables',
        loadComponent: () =>
          import('./tables/waiter-tables.component').then(c => c.WaiterTablesComponent),
        data: { requiredPolicy: 'TooHungry.Tables' },
      },
      {
        path: 'order/:tableId',
        loadComponent: () =>
          import('./order/waiter-order.component').then(c => c.WaiterOrderComponent),
        data: { requiredPolicy: 'TooHungry.Orders' },
      },
      {
        path: 'payment/:orderId',
        redirectTo: '/payment/:orderId',
        pathMatch: 'full',
      },
      { path: '**', redirectTo: 'tables' }
    ]
  },
  // Màn hình Thanh toán RM-016: Standalone Layout độc lập
  {
    path: 'payment/:orderId',
    loadComponent: () =>
      import('./payment/payment.component').then(c => c.PaymentComponent),
    canActivate: [authGuard, smartPermissionGuard],
    data: { requiredPolicy: 'TooHungry.Orders' },
  }
];
```

---

## 6. Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% người dùng có vai trò `Waiter` sau khi đăng nhập thành công qua RM-001 được điều hướng trực tiếp vào màn hình `/waiter/tables` trong thời gian dưới 500 mili-giây.
- **SC-002**: 100% nỗ lực truy cập vào cụm `/waiter/*` từ tài khoản chưa đăng nhập hoặc không có vai trò hợp lệ (`Waiter`, `Manager`, `Administrator`) bị chặn đứng và chuyển hướng an toàn.
- **SC-003**: Bố cục Waiter tải nhanh, chiếm 100% chiều cao màn hình khả dụng (full viewport height) và loại bỏ hoàn toàn các thanh menu quản trị cồng kềnh của ABP.
- **SC-004**: Trên thiết bị máy tính bảng xoay dọc hoặc màn hình < 992px, thanh Sidebar chuyển đổi hoàn hảo thành Drawer trượt, đóng mở tức thì với 1 chạm (< 250ms animation).
- **SC-005**: 100% các thành phần chữ, nhãn, ca trực, thông báo trên thanh Topbar và Sidebar hiển thị chuẩn xác cả hai ngôn ngữ Tiếng Việt và Tiếng Anh.
- **SC-006**: Nhân viên phục vụ có thể di chuyển liền mạch giữa Sơ đồ bàn (`/waiter/tables`) và Gọi món (`/waiter/order/:tableId`) mà không làm tải lại toàn bộ khung Layout hệ thống, nội dung Sidebar chuyển đổi đúng ngữ cảnh trong dưới 50ms.
- **SC-007**: Người dùng có vai trò `Manager` hoặc `Administrator` có thể bấm nút `[Quay lại Quản trị]` trên Topbar để trở về trang quản trị chính trong 1 cú chạm.

---

## 7. Các Giả định & Ràng buộc (Assumptions & Constraints)

### Giả định (Assumptions):
- Nhân viên phục vụ chủ yếu sử dụng máy tính bảng (Tablet) hoặc màn hình cảm ứng để tác nghiệp tại sảnh ăn.
- Hệ thống phân quyền sử dụng cơ chế Identity Roles & Permissions có sẵn của ABP Framework từ RM-003.
- Màn hình Sơ đồ bàn (`/waiter/tables`) từ RM-008 và Màn hình Gọi món (`/waiter/order/:tableId`) từ RM-010 đăng ký nội dung lọc của mình qua `WaiterSidebarService`.
- Màn hình Thanh toán RM-016 được thiết kế độc lập, không kế thừa layout 3 vùng có Sidebar của Waiter.

### Ràng buộc (Constraints):
- Tuân thủ nghiêm ngặt bảng màu thương hiệu Cam & Trắng đặc trưng của Acme.TooHungry (`#EA580C`, Clean White, Slate Gray).
- Mọi chuỗi văn bản giao diện bắt buộc phải có đầy đủ bản dịch trong cả hai tệp `en.json` và `vi.json`.
- Không làm ảnh hưởng đến cấu trúc routing của phân hệ Quản lý và Kho đã hoàn thiện trước đó.
