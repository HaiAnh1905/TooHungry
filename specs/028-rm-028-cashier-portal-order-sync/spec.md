# Đặc tả Tính năng (Feature Specification): Phân hệ Thu ngân & Đồng bộ Thời gian thực (Cashier Portal: Table & Order Management with Real-time Sync)

**Mã Tính năng (Feature ID)**: `RM-028`

**Nhánh Tính năng (Feature Branch)**: `028-rm-028-cashier-portal-order-sync`

**Ngày lập**: 2026-10-26

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-028: *"Thiết lập phân hệ làm việc chuyên biệt dành riêng cho Thu ngân (`Cashier Portal` tại route `/cashier`), bao gồm quản lý sơ đồ bàn ăn, xử lý toàn trình vòng đời đơn hàng (nhận đơn, điều chỉnh/xử lý món, kết thúc đơn, tính tiền/thanh toán), và thiết lập cơ chế liên kết đồng bộ hai chiều theo thời gian thực (Real-time SignalR Hub) giữa hai vai trò phục vụ chính là Waiter (Nhân viên phục vụ) và Cashier (Thu ngân)."*
- Kế thừa & Tích hợp:
  - `RM-001`: Xác thực đăng nhập & Quản lý phiên làm việc ABP Identity
  - `RM-002`: Hệ thống Shared UI, Bento Grid và chuẩn nhận diện thương hiệu Cam & Trắng (`#EA580C`, Warm French Beige)
  - `RM-003`: Phân quyền & Vai trò người dùng (`Cashier`, `Waiter`, `Manager`, `Administrator`)
  - `RM-008` & `RM-017`: Quản lý Khu vực & Bàn ăn (`RestaurantTable`, `DiningArea`, Table Status State Machine)
  - `RM-010`: POS & Quản lý Đơn hàng (`Order`, `OrderItem`, `OrderStatus`)
  - `RM-015`: Kiến trúc bố cục 3 vùng chuyên biệt của phân hệ phục vụ bàn Waiter
  - `RM-016`: Trang thanh toán đa kênh (Tiền mặt, VietQR, chiết khấu, in bill)
  - `RM-019`: Điều hướng phục hồi theo vai trò (`UserRoleNavigationService`)
  - `RM-022` & `RM-023`: Toàn vẹn dữ liệu, kiểm soát concurrency, bảo vệ SignalR Hub bằng access token factory

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 26-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.clarify` - 8 Quyết định Then chốt)

- **Q1: Cấu trúc Định tuyến & Bố cục phân hệ Thu ngân (`/cashier`)**: Không gian làm việc của Thu ngân nên được tổ chức như thế nào so với Waiter (`/waiter/tables`) và Quản trị (`/tables`, `/orders`)?
  - **A1**: **Xây dựng phân hệ độc lập `/cashier` với bộ Layout riêng biệt và 2 Tab tác nghiệp chính**:
    - Route cơ sở: `/cashier` (kèm alias redirect tự động về `/cashier/tables`).
    - Chuyển đổi nhanh qua 2 Tab chính trên Sidebar/Topbar:
      + `[Sơ đồ Bàn ăn]` (`/cashier/tables`): Quản lý sơ đồ bàn ăn (Table Management) trực quan, có bộ lọc khu vực và trạng thái bàn tương tự như phân hệ Waiter.
      + `[Danh sách Đơn hàng]` (`/cashier/orders`): Quản lý danh sách đơn hàng (Order Management) toàn trình: Đơn mới nhận, Đơn đang chế biến/xử lý, Đơn yêu cầu thanh toán (Pre-bill), và Đơn đã hoàn tất. Có badge số lượng đơn chờ nhảy số liên tục.
    - Cấu trúc layout gồm Topbar thu ngân (thông tin ca trực, doanh thu ca, số bàn phục vụ, số đơn chờ, nút Bật/Tắt âm thanh thông báo), Sidebar ngữ cảnh (bộ lọc nhanh, tìm kiếm bàn/mã đơn), và Main Content tương thích tối đa với màn hình cảm ứng POS Terminal / Desktop.

- **Q2: Mức độ tương đồng giữa Quản lý Bàn của Cashier và Waiter**: Quản lý bàn ăn của Cashier sẽ giống Waiter ở những điểm nào và khác ở những điểm nào?
  - **A2**: **Kế thừa 100% ngôn ngữ thiết kế Bento Card & Chu kỳ trạng thái bàn, nhưng bổ sung các năng lực đặc thù tại quầy thu ngân**:
    - *Điểm giống*: Hiển thị sơ đồ bàn theo khu vực, phân màu trực quan trạng thái (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `INACTIVE`), thời gian khách ngồi, trạng thái đơn hiện tại.
    - *Điểm đặc thù của Cashier*: Thẻ bàn của Cashier hiển thị thêm số tiền tạm tính hiện tại của bàn, có nút tắt **[In Pre-bill]** và nút **[Thanh toán ngay]** khi bàn đang có đơn; cho phép Cashier xếp khách trực tiếp tại quầy khi khách vào không qua Waiter.

- **Q3: Vòng đời Xử lý Đơn hàng tại Quầy Thu ngân**: Quản lý đơn hàng của Cashier bao gồm những hành động gì?
  - **A3**: **Toàn trình 4 giai đoạn**:
    1. *Nhận đơn (Receive)*: Nhận thông báo tự động khi Waiter tạo đơn mới từ bàn; hoặc tạo đơn tại quầy cho khách mang về (Take-away) / khách ngồi quầy.
    2. *Xử lý đơn (Process)*: Xem danh sách món chi tiết, xác nhận vào bếp, cập nhật số lượng, thêm ghi chú chế biến, hỗ trợ hủy món/trả món có kiểm soát lý do.
    3. *Yêu cầu thanh toán (Pre-bill)*: Nhận tín hiệu "Yêu cầu thanh toán" từ Waiter hoặc khách tại quầy, xuất hóa đơn tạm tính để đối soát món và số tiền.
    4. *Tính tiền & Đóng đơn (Checkout & Complete)*: Tích hợp modal thanh toán đa kênh (Tiền mặt - tính tiền thối tự động, VietQR động, thẻ); xác nhận thanh toán -> tự động trừ kho FEFO (`RM-022`), chuyển trạng thái đơn sang `COMPLETED`, in hóa đơn VAT/bill nhiệt, và chuyển trạng thái bàn sang `CLEANING`.

- **Q4: Cơ chế Liên kết & Đồng bộ Thời gian thực giữa Waiter và Cashier kèm Âm thanh Chuông báo**: Hai vai trò liên kết với nhau bằng cách nào khi xảy ra các sự kiện bàn, đơn và thanh toán?
  - **A4**: **Đồng bộ sự kiện thời gian thực hai chiều qua SignalR Hub (`TableHub` mở rộng / Realtime Notifier) kèm hiệu ứng âm thanh chuông báo linh hoạt**:
    - *Sự kiện Bàn ăn (Check-in / Chuyển bàn)*:
      + Khi Waiter check-in khách vào bàn -> Bắn event `TableStatusChanged` (`OCCUPIED`) -> Cashier lập tức thấy bàn đổi màu kèm thông báo Toast: *"Bàn [Số] vừa có khách do [Tên Waiter] phục vụ"*.
      + Ngược lại, khi Cashier check-in tại quầy -> Waiter cũng nhận được thông báo tương tự.
    - *Sự kiện Đơn hàng & Gọi món mới*:
      + Khi Waiter tạo đơn / thêm món mới từ bàn -> Bắn event `OrderPlacedOrUpdated` -> Màn hình Cashier phát âm thanh chuông báo (Chime nhẹ), nổi badge thông báo đơn mới, đơn tự động xuất hiện trên bảng theo dõi.
      + Khi Cashier xác nhận món / cập nhật trạng thái đơn -> Màn hình Waiter tự động cập nhật trạng thái món để thông báo khách.
    - *Sự kiện Yêu cầu Tính tiền & Hoàn tất Thanh toán*:
      + Khi Waiter bấm "Yêu cầu thanh toán" (Request Bill) tại bàn -> Bắn event `BillRequested` -> Màn hình Cashier phát chuông cảnh báo hai hồi, thẻ bàn tương ứng lập tức nhấp nháy viền cam đỏ và xuất hiện 2 nút thao tác nhanh: `[In Pre-bill]` và `[Thanh toán]`.
      + Khi Cashier hoàn tất thanh toán -> Bắn event `PaymentCompleted` -> Waiter nhận được thông báo *"Bàn [Số] đã thanh toán thành công [Số tiền] đ"*, đồng thời bàn chuyển sang trạng thái `CLEANING`.
      + Khi Waiter dọn bàn xong (Finish Cleaning) -> Bàn chuyển sang `AVAILABLE` và đồng bộ tức thời trên cả hai bên để sẵn sàng đón lượt khách mới.
    - *Nút Bật/Tắt âm thanh (Mute/Unmute)*: Bố trí nút toggle âm thanh trên thanh Topbar của quầy thu ngân để nhân viên chủ động bật hoặc tắt chuông tùy theo độ ồn và không gian nhà hàng.

- **Q5: Phân quyền & Bảo vệ Tuyến đường (`cashierAuthGuard`)**:
  - **A5**:
    - Tạo `cashierAuthGuard`: Chỉ cho phép người dùng có vai trò `Cashier`, `Manager` hoặc `Administrator` (sở hữu quyền `TooHungry.Cashier`) truy cập `/cashier/*`.
    - Cập nhật `UserRoleNavigationService` (kế thừa RM-019): Khi người dùng có vai trò `Cashier` đăng nhập thành công hoặc gặp trang lỗi (404, 403, 500), hệ thống tự động đưa về `/cashier/tables`.
    - Phân quyền chi tiết: `TooHungry.Cashier.ManageTables`, `TooHungry.Cashier.ManageOrders`, `TooHungry.Cashier.ProcessPayment`.

- **Q6: Tính bền vững khi mất kết nối mạng (Network Resilience & Idempotency)**:
  - **A6**:
    - Tận dụng cơ chế tự động kết nối lại của SignalR client (`withUrl(...).withAutomaticReconnect()`).
    - Các thao tác thanh toán tuân thủ Idempotency key (đã kiểm định tại RM-022 và RM-026), ngăn chặn tuyệt đối việc trừ kho hoặc ghi nhận thanh toán hai lần nếu mạng chập chờn hoặc người dùng bấm đúp.
    - 100% chuỗi ký tự hiển thị và thông báo thời gian thực được hỗ trợ song ngữ Tiếng Việt và Tiếng Anh (`vi.json`, `en.json`).

- **Q7: Cơ chế & Vị trí Nút Reload Dự phòng tại chỗ (In-place Fallback Refresh)**:
  - **A7**: **Trang bị nút Reload tại chỗ (`[fa-rotate] Tải lại`) đặt tại thanh công cụ / bộ lọc ngay phía trên danh sách bàn và đơn hàng ở cả hai phân hệ Waiter và Cashier**:
    - Vị trí: Đặt ngay cạnh các dropdown bộ lọc khu vực và ô tìm kiếm, có biểu tượng xoay và nhãn "Tải lại", kèm hiệu ứng xoay tròn (`fa-spin`) khi đang gửi yêu cầu lên máy chủ.
    - Khi nhân viên bấm nút: Chỉ gọi API tải lại dữ liệu của component hiện tại từ máy chủ mà **tuyệt đối không tải lại toàn bộ trang web (không F5)**.
    - Bảo toàn toàn bộ bộ lọc khu vực, trạng thái bàn, từ khóa tìm kiếm và các modal đang mở.
    - Giải quyết triệt để tình huống mạng Wi-Fi nội bộ nhà hàng chập chờn, thiết bị vừa mở lại màn hình sau chế độ chờ (sleep/wake) hoặc nhân viên muốn chủ động đối soát số liệu mới nhất tức thì.

- **Q8: Phản hồi Giao diện khi nhận Yêu cầu Thanh toán (Bill Requested)**:
  - **A8**: **Không tự động mở bung modal để tránh che khuất màn hình đang thao tác, mà làm nổi bật trực quan trên thẻ bàn**:
    - Thẻ bàn tương ứng lập tức nhấp nháy viền cam đỏ (`pulse-glow-border`) và hiển thị 2 nút thao tác nhanh: `[In Pre-bill]` (xuất phiếu tạm tính ngay) và `[Thanh toán]` (mở modal thanh toán tiền mặt/VietQR).
    - Đồng thời đơn hàng được đưa lên đầu danh sách tại mục "Yêu cầu thanh toán" của tab Đơn hàng để thu ngân xử lý nhanh.

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Trong quy trình vận hành nhà hàng F&B, **Thu ngân (Cashier)** và **Nhân viên phục vụ (Waiter)** là hai vai trò tương tác với nhau nhiều nhất và quyết định trực tiếp đến tốc độ xoay vòng bàn (Table Turnover Rate) cũng như trải nghiệm của khách hàng:
1. **Trước đây**: Hệ thống chỉ có màn hình phục vụ bàn chuyên biệt cho Waiter (`/waiter/tables`), trong khi Thu ngân phải dùng chung trang quản trị của Manager (`/tables`, `/orders`) vốn không được tối ưu cho thao tác quầy POS, thiếu các chỉ số theo dõi ca trực và thiếu cơ chế nhận thông báo đồng bộ khi Waiter đón khách hay gọi món.
2. **Với RM-028**: Xây dựng **Cashier Portal (`/cashier`)** hoàn chỉnh, đóng vai trò là trạm điều phối trung tâm tại quầy thu ngân. Thu ngân có sơ đồ bàn trực quan giống Waiter để quan sát toàn bộ nhà hàng, có bảng quản lý đơn hàng chuyên sâu để nhận đơn, xử lý đơn và tính tiền nhanh chóng; đồng thời mọi biến động trạng thái (nhận bàn, gọi món, yêu cầu hóa đơn, thanh toán, dọn bàn) đều được kết nối tức thời qua SignalR.

### Sơ đồ Luồng Tương tác Hai chiều giữa Waiter và Cashier:
```text
           NHÂN VIÊN PHỤC VỤ (WAITER)                           THU NGÂN (CASHIER)
                 [/waiter/tables]                                 [/cashier/tables & /orders]
                        │                                                     │
 1. Đón khách vào bàn   │                                                     │
    (Check-in Bàn 04)   │─────── SignalR: TableStatusChanged(OCCUPIED) ──────>│ Cập nhật Bàn 04: OCCUPIED
                        │                                                     │ Toast: "Bàn 04 có khách"
                        │                                                     │
 2. Gọi món cho khách   │                                                     │
    (3 Bò bít tết...)   │────── SignalR: OrderPlacedOrUpdated(Order #102) ────>│ Pop-up & Chuông báo đơn mới
                        │                                                     │ Đơn xuất hiện tại /cashier/orders
                        │                                                     │
 3. Khách báo tính tiền │                                                     │
    (Bấm "Yêu cầu bill")│────── SignalR: BillRequested(Bàn 04, Order #102) ───>│ Bàn 04 nhấp nháy đỏ
                        │                                                     │ In Pre-bill kiểm tra
                        │                                                     │
                        │                                                     │ 4. Thu tiền tại quầy
                        │<───── SignalR: PaymentCompleted(Order #102) ────────│    (Tiền mặt / VietQR)
    Toast: "Bàn 04 đã   │                                                     │    Trừ kho FEFO, đóng đơn
    thanh toán xong"    │                                                     │    Bàn chuyển sang CLEANING
                        │                                                     │
 5. Dọn dẹp bàn xong    │                                                     │
    (Bấm "Đã dọn xong") │─────── SignalR: TableStatusChanged(AVAILABLE) ─────>│ Bàn 04 chuyển AVAILABLE
                        │                                                     │ Sẵn sàng đón khách mới
```

---

## 2. Chân dung Người dùng & Câu chuyện Người dùng (User Personas & Stories)

### 2.1. Chân dung Người dùng (Personas)
- **Thu ngân (Cashier - Mai Thu Ngân)**: Làm việc tại quầy thu ngân với máy tính bảng hoặc máy tính POS cảm ứng. Cần nắm bắt số bàn đang phục vụ, nhận đơn mới từ phục vụ đẩy về, chốt bill nhanh chóng và thu tiền chuẩn xác không sai lệch.
- **Nhân viên phục vụ (Waiter - Tuấn Phục Vụ)**: Di chuyển giữa các khu vực bàn ăn với điện thoại/tablet. Cần biết thu ngân đã nhận đơn chưa, khách đã thanh toán chưa để dọn bàn đón khách kế tiếp.
- **Quản lý nhà hàng (Manager - Hoàng Quản Lý)**: Giám sát tổng thể hoạt động ca trực, có thể truy cập linh hoạt vào phân hệ Cashier để hỗ trợ thu ngân khi giờ cao điểm đông khách.

### 2.2. Câu chuyện Người dùng (User Stories)

#### US1: Truy cập Không gian Thu ngân Chuyên biệt
> **Là một** Thu ngân (`Cashier`),  
> **Tôi muốn** được điều hướng tự động vào Cổng Thu ngân (`/cashier`) ngay sau khi đăng nhập,  
> **Để** tôi có thể bắt đầu ca trực với đầy đủ công cụ theo dõi bàn và đơn hàng mà không bị phân tâm bởi các trang quản trị không liên quan.

#### US2: Quản lý Sơ đồ Bàn ăn tại Quầy Thu ngân
> **Là một** Thu ngân,  
> **Tôi muốn** xem sơ đồ bàn trực quan theo từng khu vực với trạng thái màu sắc tương tự Waiter,  
> **Để** tôi nắm được tổng thể bàn trống, bàn có khách, thời gian khách ngồi và tổng tiền tạm tính của từng bàn.

#### US3: Nhận & Xử lý Đơn hàng Toàn trình
> **Là một** Thu ngân,  
> **Tôi muốn** xem danh sách các đơn hàng mới đẩy về từ Waiter hoặc tự tạo đơn tại quầy, kiểm tra danh sách món, ghi chú và xử lý trạng thái đơn,  
> **Để** đảm bảo mọi món ăn của khách được ghi nhận đầy đủ và không bị bỏ sót.

#### US4: Tính tiền & Xuất Hóa đơn Đa phương thức
> **Là một** Thu ngân,  
> **Tôi muốn** xuất hóa đơn tạm tính (Pre-bill) cho khách kiểm tra, sau đó thực hiện thanh toán bằng Tiền mặt (tự tính tiền thừa) hoặc mã VietQR động,  
> **Để** thanh toán diễn ra nhanh chóng, chính xác, tự động trừ kho nguyên liệu và in hóa đơn hoàn tất.

#### US5: Nhận Thông báo Thời gian thực từ Waiter
> **Là một** Thu ngân,  
> **Tôi muốn** nhận được âm thanh và thông báo tức thời khi Waiter xếp bàn, gọi món mới hoặc gửi yêu cầu thanh toán,  
> **Để** tôi không phải liên tục ấn tải lại trang mà vẫn chủ động xử lý đơn và chuẩn bị hóa đơn kịp thời.

#### US6: Đồng bộ Trạng thái Thanh toán & Dọn bàn cho Waiter
> **Là một** Nhân viên phục vụ (`Waiter`),  
> **Tôi muốn** nhận được thông báo ngay lập tức trên điện thoại/tablet khi Thu ngân đã thanh toán xong cho bàn của tôi,  
> **Để** tôi biết bàn đã chuyển sang trạng thái chờ dọn dẹp (`CLEANING`), nhanh chóng dọn bàn và mở bàn trống đón khách mới.

---

## 3. Yêu cầu Chức năng Chi tiết (Detailed Functional Requirements)

### F1: Bố cục & Điều hướng Phân hệ Thu ngân (`/cashier`)
- **F1.1**: Xây dựng bộ layout `CashierLayoutComponent` gồm 3 khu vực:
  - **Topbar Thu ngân**:
    + Logo nhà hàng & Tên phân hệ *"Quầy Thu ngân (Cashier Portal)"*.
    + Thông tin ca trực: Tên thu ngân, thời gian bắt đầu ca.
    + Thẻ thống kê thời gian thực: Doanh thu ca hiện tại, Số bàn có khách (`OCCUPIED`), Số đơn chờ xử lý, Số đơn yêu cầu thanh toán.
    + Nút lối tắt `[Chuyển sang Quản trị]` (chỉ hiển thị nếu tài khoản có quyền Admin/Manager).
    + Nút Đăng xuất an toàn.
  - **Sidebar Điều hướng Ngữ cảnh**:
    + Nút chuyển đổi giữa hai tab chính: `[Sơ đồ Bàn ăn]` (`/cashier/tables`) và `[Danh sách Đơn hàng]` (`/cashier/orders`).
    + Ô tìm kiếm nhanh số bàn / mã đơn hàng / tên khách.
    + Bộ lọc nhanh theo Khu vực và theo Trạng thái bàn / đơn.
  - **Main Content**: Không gian hiển thị rộng rãi, tối ưu bố cục Bento Card cho màn hình POS và máy tính bảng.
- **F1.2**: Tích hợp gác cổng `cashierAuthGuard`:
  - Kiểm tra vai trò `Cashier`, `Manager` hoặc `Administrator` sở hữu quyền `TooHungry.Cashier`.
  - Nếu không đủ quyền, điều hướng sang trang lỗi 403 (RM-019).
- **F1.3**: Tích hợp `UserRoleNavigationService`:
  - Khi tài khoản `Cashier` đăng nhập thành công, điều hướng thẳng vào `/cashier/tables`.
  - Khi gặp lỗi 404/403/500, cơ chế tự động phục hồi sau 5 giây sẽ đưa về `/cashier/tables`.

### F2: Quản lý Bàn ăn dành riêng cho Thu ngân (`/cashier/tables`)
- **F2.1**: Kế thừa và đồng nhất giao diện sơ đồ bàn từ Waiter (`RM-008`, `RM-015`, `RM-017`):
  - Phân nhóm bàn theo từng Khu vực (Khu A, Khu B, Tầng 1, VIP...).
  - Bộ lọc trạng thái: Tất cả, Bàn trống (`AVAILABLE`), Đang có khách (`OCCUPIED`), Đã đặt (`RESERVED`), Chờ dọn (`CLEANING`), Khóa (`INACTIVE`).
- **F2.2**: Thẻ bàn chuẩn Bento chuyên biệt cho Cashier:
  - Hiển thị số bàn, số ghế tối đa.
  - Badge trạng thái bàn có màu chuẩn: Trắng/Xanh lá (Trống), Cam đậm (Có khách), Vàng/Hổ phách (Đặt trước), Tím/Xanh dương (Chờ dọn).
  - Thời gian khách đã ngồi (tính từ thời điểm Check-in).
  - Tình trạng đơn: Chưa gọi món, Đang dùng bữa, Yêu cầu thanh toán (nhấp nháy viền cam đỏ).
  - Tổng tiền tạm tính của bàn (tổng giá trị món ăn đang gọi).
- **F2.3**: Thao tác nhanh trên thẻ bàn:
  - Click vào bàn để mở Modal xem chi tiết đơn hàng của bàn.
  - Với bàn trống: Nút `[Đón khách]` tại quầy nếu khách vào trực tiếp.
  - Với bàn có khách: Nút `[In Pre-bill]` và nút `[Thanh toán ngay]`.
  - Hỗ trợ đổi bàn / gộp bàn khi khách chuyển chỗ.
- **F2.4**: Nút Reload Sơ đồ Bàn tại chỗ (In-place Table Reload Button):
  - Cả hai giao diện Waiter (`/waiter/tables`) và Cashier (`/cashier/tables`) đều được trang bị nút làm mới trực quan (`[fa-rotate] Tải lại / Reload`) ở thanh công cụ.
  - Khi bấm, component thực hiện tải lại danh sách bàn và trạng thái bàn từ máy chủ ngay tại chỗ, không reload (F5) toàn bộ trang web và giữ nguyên bộ lọc khu vực / từ khóa tìm kiếm. Hiển thị hiệu ứng xoay icon (`fa-spin`) khi đang gửi yêu cầu lên server.

### F3: Quản lý Đơn hàng Tập trung (`/cashier/orders`)
- **F3.1**: Bảng điều khiển đơn hàng theo 4 trạng thái dạng cột/tab Bento:
  - `Đơn mới nhận (Pending)`: Các đơn món mới đẩy về từ Waiter hoặc tạo mới tại quầy.
  - `Đang chế biến / Xử lý (Processing)`: Bếp/Bar đang chuẩn bị món.
  - `Yêu cầu thanh toán (Bill Requested)`: Khách hoặc Waiter đã bấm yêu cầu xuất hóa đơn.
  - `Đã thanh toán (Completed)`: Lịch sử các đơn đã hoàn tất trong ca trực.
- **F3.2**: Thao tác xử lý đơn:
  - Xem chi tiết danh sách món: Tên món, đơn giá, số lượng, thành tiền, ghi chú món (không cay, ít đá...).
  - Thêm món / tăng giảm số lượng món theo yêu cầu.
  - Hủy món có lý do (hết nguyên liệu, khách đổi ý) và cập nhật lại tổng tiền.
- **F3.3**: Quy trình Thanh toán (Billing & Payment Checkout):
  - Tích hợp modal thanh toán kế thừa `RM-016`:
    + Kiểm tra danh sách món, phụ thu, thuế VAT (nếu có), chiết khấu giảm giá.
    + Xuất hóa đơn tạm tính (Pre-bill) dạng PDF hoặc bản in nhiệt.
    + Lựa chọn phương thức: Tiền mặt (`Cash` - tự động tính tiền thừa dựa trên số tiền khách đưa) hoặc Chuyển khoản QR (`VietQR` - tự động tạo mã QR chứa chính xác số tiền và cú pháp chuyển khoản).
    + Nút `[Xác nhận Thanh toán]`: Thực hiện gọi API hoàn tất đơn hàng, tự động trừ kho nguyên liệu FEFO, đóng trạng thái đơn sang `COMPLETED`, in hóa đơn chính thức, và phát tín hiệu SignalR đồng bộ sang cho Waiter.
- **F3.4**: Nút Reload Danh sách Đơn hàng tại chỗ (In-place Order Reload Button):
  - Cả hai giao diện quản lý đơn hàng (Waiters và Cashier tại `/cashier/orders`) đều có nút reload nhanh tại thanh công cụ để cập nhật tức thì trạng thái các đơn hàng, danh sách món và tình trạng thanh toán mà không làm mới toàn bộ trang web.

### F4: Hệ thống Liên kết & Đồng bộ Hai chiều Thời gian thực (SignalR Hub)
- **F4.1**: Mở rộng `TableHub` và `TableRealtimeNotifier` trên Backend để phát các sự kiện sau:
  - `TableStatusChanged`: Phát khi trạng thái bàn thay đổi (`AVAILABLE`, `OCCUPIED`, `CLEANING`, v.v.).
  - `OrderPlacedOrUpdated`: Phát khi Waiter tạo đơn mới hoặc gọi thêm món cho bàn.
  - `BillRequested`: Phát khi Waiter hoặc khách tại bàn bấm yêu cầu thanh toán.
  - `PaymentCompleted`: Phát khi Thu ngân hoàn tất thanh toán cho đơn hàng.
- **F4.2**: Xử lý tại Frontend Thu ngân (`CashierPortal`):
  - Khi nhận `TableStatusChanged`: Cập nhật màu thẻ bàn tức thì, hiển thị thông báo Toast nếu bàn vừa có khách.
  - Khi nhận `OrderPlacedOrUpdated`: Phát âm thanh chuông báo (Chime audio notification), tăng số đếm đơn chờ trên Topbar, thêm đơn mới vào danh sách.
  - Khi nhận `BillRequested`: Kích hoạt hiệu ứng viền nhấp nháy trên thẻ bàn tương ứng, hiển thị thông báo ưu tiên cao kèm nút tắt `[Mở thanh toán]`.
- **F4.3**: Xử lý tại Frontend Phục vụ bàn (`WaiterPortal`):
  - Khi nhận `PaymentCompleted`: Cập nhật trạng thái bàn trên sơ đồ Waiter sang `CLEANING`, hiển thị Toast: *"Bàn [Số] đã thanh toán thành công [Số tiền] đ. Vui lòng tiến hành dọn bàn."*
  - Khi Waiter dọn bàn xong bấm `[Đã dọn xong]`: Bàn chuyển về `AVAILABLE`, phát `TableStatusChanged` sang cho Cashier đồng bộ tức thì.
- **F4.4**: Cơ chế Reload dự phòng độc lập ở cả hai vai trò (In-place Fallback Refresh):
  - Bên cạnh việc tự động nhận sự kiện thời gian thực qua SignalR Hub, cả hai giao diện Waiter và Cashier đều được trang bị nút Reload độc lập để nhân viên chủ động đồng bộ lại state mới nhất trong các tình huống mạng chập chờn hoặc thiết bị vừa mở lại màn hình mà không bao giờ phải F5 tải lại toàn bộ trang web.

### F5: Phân quyền & Bảo mật (Security & Permissions)
- **F5.1**: Định nghĩa cây quyền hạt nhân ABP cho Cashier:
  - `TooHungry.Cashier` (Quyền gốc truy cập phân hệ Cashier)
  - `TooHungry.Cashier.ManageTables` (Quyền thao tác xếp bàn, chuyển bàn tại quầy)
  - `TooHungry.Cashier.ManageOrders` (Quyền nhận đơn, điều chỉnh món, hủy món)
  - `TooHungry.Cashier.ProcessPayment` (Quyền thực hiện thanh toán, chiết khấu, chốt hóa đơn)
- **F5.2**: Toàn bộ kết nối SignalR Hub được xác thực qua Access Token JWT/OAuth2 (tuân thủ RM-023).

### F6: Đa ngôn ngữ & Quốc tế hóa (i18n)
- **F6.1**: Cấu hình đầy đủ 100% nhãn giao diện, bộ lọc, thẻ bàn, trạng thái đơn và nội dung thông báo thời gian thực trong cả 4 tệp localization:
  - `angular/src/assets/i18n/vi.json` & `en.json`
  - `src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json` & `en.json`

---

## 4. Tiêu chí Nghiệm thu (Acceptance Criteria - Gherkin Scenarios)

### Kịch bản 1: Điều hướng Phân hệ & Gác cổng Vai trò Thu ngân
```gherkin
Given tài khoản có vai trò "Cashier" đăng nhập thành công vào hệ thống
When người dùng hoàn tất xác thực hoặc truy cập đường dẫn "/"
Then hệ thống tự động điều hướng người dùng vào "/cashier/tables"
And hiển thị đầy đủ Topbar ca trực, Sidebar điều hướng và Sơ đồ bàn ăn
And người dùng không có vai trò phù hợp truy cập "/cashier/*" sẽ bị chặn 403 và chuyển về trang phục hồi
```

### Kịch bản 2: Đồng bộ Thời gian thực khi Waiter Check-in Bàn mới
```gherkin
Given Thu ngân đang mở màn hình Sơ đồ bàn ăn tại "/cashier/tables"
And Bàn số "05" đang ở trạng thái "AVAILABLE" (màu trắng)
When Waiter tại bàn bấm check-in đón 4 khách vào Bàn số "05"
Then trên màn hình của Thu ngân, Bàn số "05" chuyển màu cam đậm ("OCCUPIED") trong vòng dưới 200ms
And hiển thị thông báo Toast: "Bàn 05 vừa có khách do Waiter phục vụ"
And số bàn đang phục vụ trên Topbar của Thu ngân tự động tăng thêm 1 mà không cần reload trang
```

### Kịch bản 3: Đồng bộ Đơn món mới từ Waiter đến Thu ngân
```gherkin
Given Thu ngân đang ở phân hệ Cashier
When Waiter gửi đơn gọi món mới gồm 3 món cho Bàn số "05"
Then màn hình Cashier phát âm thanh chuông báo đơn mới
And hiển thị pop-up thông báo: "Bàn 05 vừa gọi thêm 3 món mới"
And đơn hàng xuất hiện ngay lập tức trong tab "Đơn mới nhận" tại "/cashier/orders"
And thẻ Bàn số "05" cập nhật số tiền tạm tính tương ứng với giá trị 3 món ăn
```

### Kịch bản 4: Waiter Gửi Yêu cầu Thanh toán & Thu ngân Xử lý
```gherkin
Given Bàn số "05" đang có khách dùng bữa và có đơn hàng hoạt động
When Waiter bấm nút "Yêu cầu thanh toán" từ màn hình phục vụ
Then thẻ Bàn số "05" trên màn hình Thu ngân nhấp nháy viền cam đỏ cảnh báo
And hiển thị thẻ đơn tại mục "Yêu cầu thanh toán" trong danh sách đơn hàng
When Thu ngân bấm "In Pre-bill"
Then hệ thống xuất phiếu tạm tính đầy đủ danh sách món, phụ thu và tổng tiền để phục vụ gửi khách kiểm tra
```

### Kịch bản 5: Hoàn tất Thanh toán & Đồng bộ Dọn bàn cho Waiter
```gherkin
Given Thu ngân mở hộp thoại thanh toán cho Bàn số "05"
When Thu ngân chọn hình thức "Tiền mặt" hoặc "VietQR" và bấm "Xác nhận thanh toán"
Then hệ thống trừ kho nguyên liệu tự động theo nguyên tắc FEFO
And trạng thái đơn chuyển sang "COMPLETED"
And Bàn số "05" tự động đổi trạng thái sang "CLEANING"
And trên màn hình của Waiter xuất hiện thông báo: "Bàn 05 đã thanh toán thành công [Số tiền] đ. Vui lòng tiến hành dọn bàn"
When Waiter dọn bàn xong và bấm "Đã dọn xong"
Then Bàn số "05" trên cả hai màn hình Waiter và Cashier đồng thời chuyển về "AVAILABLE"
```

### Kịch bản 6: Thao tác Reload tại chỗ trên cả hai Phân hệ mà không Reload Trang web
```gherkin
Given nhân viên đang thao tác tại màn hình Sơ đồ bàn (hoặc Quản lý đơn hàng) của Waiter hoặc Cashier
And nhân viên đã áp dụng bộ lọc khu vực "Tầng 1" và từ khóa tìm kiếm "Bàn 04"
When nhân viên bấm nút "Tải lại / Reload" [fa-rotate] trên thanh công cụ
Then hệ thống gọi API lấy dữ liệu mới nhất từ máy chủ
And icon xoay tròn biểu thị đang tải dữ liệu
And toàn bộ trang web KHÔNG bị tải lại (không F5)
And bộ lọc khu vực "Tầng 1" và từ khóa "Bàn 04" vẫn được bảo toàn nguyên vẹn
And danh sách bàn/đơn cập nhật trạng thái mới nhất từ server
```

---

## 5. Yêu cầu Phi Chức năng (Non-Functional Requirements)

1. **Hiệu năng & Độ trễ Thời gian thực (Real-time Latency)**:
   - Tín hiệu SignalR từ khi phát sinh tại Waiter đến khi hiển thị trên màn hình Cashier (và ngược lại) phải đạt độ trễ dưới **200ms** trong điều kiện mạng nội bộ nhà hàng.
   - Tránh re-render toàn bộ DOM bàn ăn; chỉ cập nhật phản ứng đúng thẻ bàn và đơn hàng có thay đổi thông qua Angular Signals / RxJS.

2. **Khả năng phục hồi kết nối (Resilience & Auto-reconnect)**:
   - Tự động kết nối lại SignalR Hub nếu bị gián đoạn mạng (mất Wi-Fi tạm thời). Khi kết nối phục hồi, tự động truy vấn lại state mới nhất để đảm bảo không bị lệch dữ liệu.

3. **Giao diện Cảm ứng & Khả năng tiếp cận (Touch Ergonomics & Accessibility)**:
   - Kích thước các nút bấm thao tác trên thẻ bàn và form thanh toán tối thiểu đạt chuẩn **44×44px**, phù hợp thao tác nhanh bằng ngón tay trên màn hình POS cảm ứng.
   - Tương phản màu sắc tuân thủ WCAG 2.1 AA.

4. **An toàn Giao dịch & Chống trùng lặp (Idempotency)**:
   - Ngăn chặn triệt để tình trạng click đúp nút "Xác nhận thanh toán" dẫn đến trừ kho 2 lần hoặc sinh 2 giao dịch thanh toán trùng lặp (tuân thủ RM-022 và RM-026).
