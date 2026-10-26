# Đặc tả Tính năng (Feature Specification): Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular (Angular Architecture & Performance Refactoring)

**Mã Tính năng (Feature ID)**: `RM-024`

**Nhánh Tính năng (Feature Branch)**: `024-rm-024-angular-architecture-and-performance-refactoring`

**Ngày tạo**: 2026-10-23

**Trạng thái**: Hoàn thiện (Clarified - Ready for Plan)

**Đầu vào**:
- Yêu cầu từ Roadmap RM-024: *"Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular (Angular Architecture & Performance Refactoring) — Tái cấu trúc kiến trúc Frontend, triệt tiêu rò rỉ bộ nhớ (Memory leaks), cải thiện hiệu năng hiển thị và sửa các lỗi phân trang/điều hướng nghiêm trọng"*.
- Tổng hợp 24 phát hiện kỹ thuật trọng yếu từ tài liệu `CODE_REVIEW.md` (Frontend):
  - Frontend #1: `order.component.ts:167-185`: Phân trang hỏng do tìm kiếm và lọc status chỉ chạy trên trang client hiện tại rồi ghi đè `totalCount = items.length`, làm biến mất dữ liệu từ đơn thứ 11 trở đi.
  - Frontend #2: `app.component.ts:63`, `dashboard.guard.ts:42,67`, `waiter-auth.guard.ts:39`, `user-role-navigation.service.ts:138`: Điều hướng tới route không tồn tại `/table/layout` làm crash phiên làm việc của nhân viên Thu ngân (Cashier).
  - Frontend #3: `app.component.ts:51, 80`: Subscription `currentUser` không có toán tử giới hạn `take(1)` khiến mỗi lần đổi tab (`visibilitychange`) tích lũy rò rỉ subscription, gọi `refreshAppState()` dồn dập N lần.
  - Frontend #5: `order.component.ts:612-617, 720`: Gửi `unitPrice` và `totalAmount` từ form client lên server (đi cặp với lỗ hổng BE #2).
  - Frontend #6: `proxy/ingredients/ingredient.service.ts:44`, `proxy/recipes/recipe.service.ts:40`, `proxy/dashboard/*`: Proxy sinh tự động của ABP bị sửa code bằng tay, có nguy cơ bị ghi đè mất hoàn toàn khi chạy `abp generate-proxy`.
  - Frontend #8: `sidebar-widgets.component.ts:84-109`: Timer 1 giây chạy bên trong Angular NgZone kích hoạt change detection toàn bộ ứng dụng mỗi giây; interval 300ms lặp vô tận rò rỉ tài nguyên ở layout không có sidebar.
  - Frontend #10: Cơ chế Change Detection không nhất quán: pha trộn tùy tiện giữa Angular Signals và việc gọi thủ công `cdr.detectChanges()` rải rác bên trong các subscription.
  - Frontend #11: `table.component.ts:297-309, 588-653`: Tải 200 bản ghi rồi tự phân trang ở client trong khi `ListService` vẫn gọi lại API; `computed` đọc `list.page` không phải là một signal.
  - Frontend #12: Tải toàn bộ dữ liệu thái quá: `order.ts:192-193` tải 1000 recipes và 1000 ingredients mỗi khi mở modal chỉ để tự tính tồn kho client. Cần thay thế bằng API máy chủ `orderService.validateStock`.
  - Frontend #13: Trùng lặp code diện rộng giữa `table.component.ts` và `waiter-tables.component.ts` (cùng xử lý SignalR, 5 computed đếm bàn, `getStatusBadgeClass`, `getActionLabel`). Cần tách `TableStateService`, `<app-table-card>` và `TableStatusPipe` dùng chung.
  - Frontend #14: Chuỗi ngôn ngữ viết cứng (hardcode), không qua hệ thống bản dịch ABP: Toast tiếng Việt hardcode ở `inventory.ts`, `order.ts`, `ingredient.ts`; `isVi ? 'Gọi món' : 'Order'`; lỗi dùng sai fallback của `instant(key)`.
  - Frontend #15: Lỗi hiển thị 2 lần đồng thời: ABP tự động bật modal báo lỗi hệ thống, component lại gọi thêm `toaster.error(...)`. Cần truyền cờ `{ skipHandleError: true }` khi component chủ động xử lý lỗi.
  - Frontend #16: Kỹ thuật lập trình phản ứng bất hợp lý (Nested Subscribes 3 tầng) tại `waiter-tables.ts` và `inventory.ts`. Cần chuyển đổi sang các toán tử declarative của RxJS (`switchMap`, `exhaustMap`).
  - Frontend #17: Lệch ngày giờ do dùng chuỗi định dạng UTC `toISOString().split('T')[0]` tại `inventory.ts`, `order.ts` khiến khoảng thời gian từ 0h đến 7h sáng giờ Việt Nam bị tính lùi về ngày hôm qua.
  - Frontend #18: `order.ts:413`: Client tự sinh mã đơn ngẫu nhiên `ORD-...` dẫn đến nguy cơ xung đột mã đơn hàng.
  - Frontend #20: `order.component.html:642`: Sử dụng `[innerHTML]` hiển thị cảnh báo chứa tên nguyên liệu do người dùng nhập, tiềm ẩn nguy cơ XSS.
  - Frontend #21: Component Quản lý kho quá khổ: Tách rời các tab và modal chuyên biệt để giảm kích thước component.
  - Frontend #22: Boilerplate phân trang bị sao chép lặp lại ở 7 màn hình kèm mã hack `window.dispatchEvent(new Event('resize'))`. Cần chuẩn hóa component phân trang dùng chung `<app-pager>`.
  - Frontend #23: Hiệu năng hiển thị template kém do các hàm getter tạo mảng mới mỗi chu kỳ Change Detection (`categoryOptions`, `ingredientSelectOptions`, `pageSizeOptions`, `groupedDishes`); thuật toán sắp xếp O(n^2) tại bảng tồn kho.
  - Frontend #24: `custom-toaster.service.ts`: Truy cập thuộc tính private của ABP thông qua ép kiểu `(this as any).toasts`.
  - Frontend #26: Giảm thiểu xung đột và đồng bộ phong cách giữa các bộ giao diện (ngx-datatable và custom design).
  - Frontend #30: Khung giờ mở cửa nhà hàng (9h - 23h) bị hardcode rải rác ở 4 nơi (`sidebar-widgets.ts`, `table.ts`, `home.ts`, `waiter-layout.ts`).
  - Frontend #32: Tập tin CSS phình to (`table.component.scss` ~100KB), lạm dụng hơn 1800 chỉ thị `!important`, định nghĩa lặp lại các class tương đồng.
  - Frontend #34: `waiter-layout.component.ts`: Đổi ngôn ngữ sử dụng `window.location.reload()` gây giật màn hình; định dạng tiền tệ thủ công `' đ'` thay vì pipe `currency:'VND'`.
- Tuân thủ Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md) (DDD, ABP Layering, UI/UX Cam & Trắng, i18n song ngữ 100% trong `en.json` và `vi.json`).

---

## Làm rõ Yêu cầu & Quyết định Kiến trúc (Clarifications & Architectural Decisions)

### Phiên 23-10-2026 (Phiên làm rõ Yêu cầu Trọng yếu `/speckit.specify RM-024` - 8 Quyết định Kỹ thuật Then chốt)

- **Q1: Giải pháp khắc phục triệt để Lỗi Phân trang & Điều hướng Tuyến đường**:
  - **A1**:
    - **Phân trang Đơn hàng (`order.component.ts`)**:
      + Loại bỏ hoàn toàn việc lọc mảng trên trang hiện tại (`items.filter(...)`) và ghi đè `totalCount = items.length` trong callback của `hookToQuery`.
      + Tận dụng các tham số lọc ở cấp máy chủ: truyền `filter` (từ khóa tìm kiếm) và `status` (trạng thái đơn) trực tiếp vào `streamCreator` của ABP `ListService`.
      + Giữ nguyên giá trị `res.totalCount` do Backend trả về để đảm bảo phân trang server-driven chính xác 100%, cho phép người dùng xem đầy đủ các trang tiếp theo (từ trang 2, trang 3...).
    - **Điều hướng Tuyến đường Chuẩn hóa**:
      + Xóa bỏ hoàn toàn route lỗi `/table/layout` tại: `app.component.ts:63`, `shared/services/user-role-navigation.service.ts:138`, `shared/guards/dashboard.guard.ts`.
      + Thay thế bằng route `/tables` (hoặc `/waiter/tables` nếu là nhân viên phục vụ bàn).
      + Duy trì định tuyến Wildcard `**` trỏ về `ErrorPageComponent` với trạng thái 404 để bắt trọn mọi URL không hợp lệ.

- **Q2: Triệt tiêu Rò rỉ Bộ nhớ (Memory Leaks) & Tối ưu Vòng lặp Change Detection**:
  - **A2**:
    - **Triệt tiêu Memory Leak `app.component.ts`**:
      + Đăng ký lắng nghe `visibilitychange`: Sử dụng `.pipe(filter(u => !!u?.isAuthenticated), take(1))` khi đọc `currentUser` từ `configState`, ngăn ngừa việc tích lũy các subscription rò rỉ sau mỗi lần người dùng chuyển đổi tab trình duyệt.
      + Đồng thời quản lý và giải phóng sạch sẽ event listener khi component bị hủy (`ngOnDestroy`).
    - **Tối ưu Hóa `sidebar-widgets.component.ts`**:
      + Sử dụng `NgZone.runOutsideAngular` để bao bọc bộ đếm thời gian 1 giây (`setInterval`). Chỉ gọi `ngZone.run(() => this.cdr.markForCheck())` khi thực sự cần vẽ lại đồng hồ, không làm kích hoạt chu trình Change Detection của toàn bộ ứng dụng mỗi giây.
      + Loại bỏ interval thăm dò 300ms lặp vô tận. Giới hạn số lần thử tìm kiếm DOM LeptonX tối đa 10 lần (`attempts <= 10`), nếu không tìm thấy thì tự động dừng `clearInterval` để tránh rò rỉ bộ nhớ vĩnh viễn ở các layout không có sidebar.

- **Q3: Xây dựng Thành phần Dùng chung: Component Phân trang `<app-pager>` & Quản lý Bàn ăn**:
  - **A3**:
    - **Component Phân trang Dùng chung `<app-pager>`**:
      + Tạo standalone component `<app-pager>` tại `shared/components/pager/pager.component.ts` tuân thủ design system Cam & Trắng.
      + Nhận đầu vào: `[totalCount]`, `[pageSize]`, `[currentPage]`, `[pageSizeOptions]`, và phát sự kiện `(pageChange)` cùng `(pageSizeChange)`.
      + Tích hợp trực tiếp với ABP `ListService` hoặc Custom Signal State.
      + Thay thế toàn bộ khối mã HTML/TypeScript phân trang bị copy-paste ở 7 màn hình (`order`, `dish`, `dish-category`, `unit`, `ingredient`, `recipe`, `table`).
      + Loại bỏ triệt để thủ thuật hack DOM `window.dispatchEvent(new Event('resize'))` và các timer 50ms/200ms rải rác.
    - **Thành phần Dùng chung cho Quản lý Bàn ăn**:
      + Xây dựng `TableStateService` tại `shared/services/table-state.service.ts` để quản lý tập trung: danh sách bàn, trạng thái lọc, sự kiện Realtime SignalR (`tableStatusChanged$`), tính toán thống kê số lượng bàn theo từng trạng thái (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `INACTIVE`).
      + Xây dựng component dùng chung `<app-table-card>` tại `shared/components/tables/table-card/table-card.component.ts` hiển thị thông tin thẻ bàn, badge trạng thái và các nút hành động, dùng chung cho cả trang Quản lý Admin (`/tables`) và giao diện Phục vụ (`/waiter/tables`).
      + Tạo pipe chuyển đổi trạng thái `TableStatusPipe` để chuẩn hóa nhãn và màu sắc trạng thái bàn.

- **Q4: Tối ưu Template, Cache & Triệt tiêu Tải Dữ liệu Khổng lồ Phía Client**:
  - **A4**:
    - **Loại bỏ tải 1000 bản ghi tại `order.component.ts`**:
      + Xóa bỏ hàm `loadRecipesAndIngredients()` tải 1000 công thức và 1000 nguyên liệu để client tự tính tồn kho.
      + Chuyển đổi hoàn toàn sang việc gọi API xác thực tồn kho tập trung phía server `orderService.validateStock(items)` (tương tự kiến trúc đã áp dụng chuẩn mực tại `waiter-order.component.ts`).
    - **Tối ưu Hóa Template Getters**:
      + Thay thế tất cả các hàm getter sinh mảng mới mỗi chu kỳ Change Detection (`categoryOptions`, `ingredientSelectOptions`, `pageSizeOptions`, `groupedDishes`) bằng Angular Signals `computed()` hoặc memoized array được nạp một lần khi dữ liệu nguồn biến động.
    - **Tối ưu Thuật toán Sắp xếp Kho**:
      + Loại bỏ thuật toán sắp xếp O(n^2) trong bảng tồn kho (`inventory.component.ts`). Chuẩn bị trước Map tra cứu dữ liệu theo `ingredientId` để việc tra cứu và so sánh đạt độ phức tạp O(1).
    - **Loại bỏ Client Sinh Mã Đơn & Chống XSS**:
      + Xóa bỏ logic tự sinh mã đơn `ORD-...` ngẫu nhiên ở client tại `order.component.ts:413`. Backend sẽ chịu trách nhiệm sinh mã chuẩn xác và duy nhất.
      + Sửa thẻ `<span [innerHTML]="warning"></span>` tại `order.component.html:642` sang string interpolation `{{ warning }}` để ngăn chặn triệt để nguy cơ tấn công XSS.

- **Q5: Chuẩn hóa Xử lý Lỗi, Tránh Thông báo Kép & Độc lập Hóa Service Proxies**:
  - **A5**:
    - **Chống hiển thị lỗi 2 lần (Double Error Dialog)**:
      + Khi các component tự bắt lỗi để hiển thị toast (`catchError` hoặc block `error:` trong subscribe), bắt buộc truyền tùy chọn `{ skipHandleError: true }` vào cấu hình request của ABP RestService, hoặc cấu hình `ToasterService` không kích hoạt modal toàn cục của ABP.
      + Đọc thông điệp lỗi chính xác từ cấu trúc chuẩn của ABP: `err?.error?.error?.message || err?.error?.message || defaultMsg`.
    - **Độc lập Hóa Service Proxies (Bảo vệ Proxy khỏi bị ghi đè)**:
      + Tuyệt đối không can thiệp code tùy biến vào các file trong thư mục `angular/src/app/proxy/`.
      + Chuyển các phương thức mở rộng hoặc tùy biến (`getList` hỗ trợ boolean `includeInactive`, logic dashboard tự viết) ra các service bao bọc riêng biệt tại `app/core/services/` hoặc các service mở rộng kế thừa proxy (ví dụ `ExtendedIngredientService`).

- **Q6: Chuẩn hóa Quốc tế hóa (i18n), Tránh Reload Trang & Múi giờ Địa phương**:
  - **A6**:
    - **Loại bỏ 100% Chuỗi Hardcode**:
      + Rà soát và chuyển đổi toàn bộ chuỗi tiếng Việt hardcode trong các thông báo toast và nhãn giao diện (`inventory`, `order`, `ingredient`, `waiter-layout`) sang các khóa bản dịch trong `vi.json` và `en.json`.
      + Sửa lỗi sử dụng hàm `instant(key) || 'fallback'` thành `instant(key, ...params)` chuẩn ABP.
    - **Chuyển đổi Ngôn ngữ Không Giật Trang**:
      + Trong `waiter-layout.component.ts`, loại bỏ `window.location.reload()`. Sử dụng cơ chế phản xạ ngôn ngữ nội tại của ABP `sessionState.setLanguage(langCode)` để giao diện tự cập nhật mượt mà.
      + Sử dụng Angular pipe `currency:'VND':'symbol':'1.0-0'` thay thế cho việc nối chuỗi thủ công `' đ'`.
    - **Chuẩn hóa Xử lý Ngày Giờ Địa phương**:
      + Thay thế hoàn toàn cách lấy ngày bằng chuỗi UTC `new Date().toISOString().split('T')[0]` bằng hàm `formatDate(new Date(), 'yyyy-MM-dd', 'vi')` hoặc tính toán theo múi giờ địa phương của trình duyệt, triệt tiêu lỗi lệch 1 ngày khi người dùng thao tác vào khung giờ 0h - 7h sáng.

- **Q7: Tái cấu trúc SCSS, Dọn dẹp `!important` & Đồng bộ Hệ thống Thiết kế**:
  - **A7**:
    - **Tối ưu Hóa SCSS Quản lý Bàn (`table.component.scss`)**:
      + Tách các khối style chung (card bàn, status badge, modal) thành các module SCSS dùng chung hoặc chuyển vào scoped SCSS của component con `<app-table-card>`.
      + Giảm dung lượng tập tin `table.component.scss` từ ~100KB xuống dưới 30KB.
    - **Giảm Thiểu `!important`**:
      + Rà soát và loại bỏ các chỉ thị `!important` không cần thiết trong `styles.scss` và các component SCSS bằng cách tăng độ ưu tiên của selector (CSS specificity) một cách hợp lý và chuẩn hóa các biến CSS tokens.
    - **Hằng số Giờ Mở Cửa Tập Trung**:
      + Đưa khung giờ hoạt động (9h - 23h) vào tệp hằng số cấu hình tập trung `RESTAURANT_BUSINESS_HOURS` trong `shared/constants/business-hours.constant.ts`, thay vì gán giá trị literal tại 4 file riêng biệt.

- **Q8: Tái cấu trúc RxJS & An toàn Hóa Custom Toaster**:
  - **A8**:
    - **Triệt tiêu Nested Subscribes**:
      + Chuyển đổi các đoạn mã đăng ký lồng nhau 3 tầng tại `waiter-tables.ts` và `inventory.ts` sang chuỗi toán tử phản ứng RxJS phẳng: `confirmation.warn(...).pipe(filter(status => status === Confirmation.Status.confirm), switchMap(() => ...))`.
    - **An toàn Hóa `CustomToasterService`**:
      + Loại bỏ việc truy cập thuộc tính nội bộ private `(this as any).toasts` và `(this as any).containerComponentRef`.
      + Tùy biến giới hạn số lượng toast và vị trí hiển thị thông qua cấu hình `Toaster.ToastOptions` chính thức của ABP Theme Shared hoặc can thiệp thông qua CSS container styling.

### Phiên Phỏng vấn Làm rõ Chuyên sâu 23-10-2026 (Interactive Clarification Session `/speckit.clarify RM-024` - 4 Quyết định Chốt hạ)

- **Q1: Kiến trúc Component Phân trang Dùng chung `<app-pager>`**:
  - **A1**: Triển khai dưới dạng Standalone Component `<app-pager>` hỗ trợ linh hoạt cả Two-Way Binding `[(page)]`/`[(pageSize)]` lẫn ABP `ListService` Adapter để tương thích mượt mà cho cả bảng dữ liệu (Table) lẫn dạng lưới thẻ bàn (Grid Card).
- **Q2: Chiến lược Tái cấu trúc Tệp CSS `table.component.scss` (từ ~100KB)**:
  - **A2**: Tách module: Chuyển toàn bộ style của Thẻ bàn vào scoped SCSS của `<app-table-card>`, chuyển style của Modal vào các modal con tương ứng, giữ lại stylesheet layout chính với dung lượng < 25KB và dọn dẹp triệt để hơn 300 chỉ thị `!important`.
- **Q3: Thời điểm Gọi API Máy chủ `orderService.validateStock` tại Modal Đơn hàng (`/orders`)**:
  - **A3**: Kiểm tra Realtime có Debounce 300ms khi người dùng thay đổi số lượng món trong giỏ hàng để phản hồi cảnh báo tức thì, kết hợp kiểm tra chốt chặn lần cuối khi người dùng bấm nút "Lưu đơn hàng".
- **Q4: Tuyến đường Làm việc Mặc định của Thu ngân (Cashier) sau khi Xóa Route Chết `/table/layout`**:
  - **A4**: Phân luồng động 100% theo quyền hạn: Nếu Thu ngân có quyền quản trị/tạo bàn (`TooHungry.Tables.Create` hoặc quyền Admin) thì chuyển hướng vào `/tables` (Sơ đồ quản trị); nếu chỉ có quyền thao tác phục vụ/thanh toán thì chuyển hướng vào `/waiter/tables` (Giao diện phục vụ).

---

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Khắc phục Triệt để Lỗi Phân trang & Điều hướng Tuyến đường (Broken Pagination & Route Fixes) (Ưu tiên: P1)

Là một **Quản lý nhà hàng hoặc Nhân viên Thu ngân**, tôi muốn tra cứu danh sách đơn hàng được phân trang chính xác và điều hướng vào đúng trang làm việc của mình sau khi đăng nhập, để không bị mất dữ liệu đơn hàng và không gặp lỗi màn hình trắng hay trang hỏng.

**Lý do cho mức độ ưu tiên này**: Lỗi phân trang đơn hàng khiến người dùng không thể tra cứu các đơn hàng từ trang 2 trở đi; lỗi định tuyến `/table/layout` làm crash phiên đăng nhập của Thu ngân, gây gián đoạn trực tiếp tới hoạt động vận hành và tính tiền của nhà hàng.

**Kiểm thử Độc lập**:
- Đăng nhập với tài khoản Thu ngân (Cashier), xác minh hệ thống điều hướng chính xác vào `/tables` (hoặc `/waiter/tables`), không còn chuyển vào URL `/table/layout`.
- Mở màn hình Quản lý đơn hàng `/orders` khi có hơn 20 đơn hàng, nhập từ khóa tìm kiếm và lọc theo trạng thái: xác minh thanh phân trang hiển thị đúng tổng số bản ghi (`totalCount`), người dùng có thể bấm chuyển sang trang 2, trang 3 để xem tiếp các đơn hàng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** danh sách đơn hàng có 35 bản ghi trên hệ thống, **Khi (When)** người dùng mở màn hình `/orders`, **Thì (Then)** bảng dữ liệu hiển thị 10 dòng đầu tiên và thanh phân trang hiển thị rõ ràng tổng số 35 đơn hàng với 4 trang khả dụng.
2. **Cho trước (Given)** đang xem trang danh sách đơn hàng, **Khi (When)** người dùng chọn lọc trạng thái "Đang xử lý (Processing)", **Thì (Then)** request gửi lên máy chủ chứa tham số `status`, bảng cập nhật đúng số lượng đơn đang xử lý và tổng số trang tương ứng do máy chủ trả về, không bị cắt mảng client.
3. **Cho trước (Given)** người dùng có vai trò Thu ngân (Cashier) vừa đăng nhập thành công, **Khi (When)** hệ thống phân giải tuyến đường mặc định, **Thì (Then)** người dùng được đưa tới trang `/tables`, tuyệt đối không xuất hiện lỗi điều hướng tới `/table/layout`.
4. **Cho trước (Given)** người dùng cố ý nhập một đường dẫn không tồn tại trên thanh địa chỉ trình duyệt (ví dụ `/table/layout`), **Khi (When)** hệ thống kích hoạt bộ định tuyến, **Thì (Then)** giao diện hiển thị trang thông báo lỗi 404 thân thiện kèm nút quay về trang chủ hợp lệ.

---

### User Story 2 - Triệt tiêu Rò rỉ Bộ nhớ (Memory Leaks) & Tối ưu Vòng lặp Change Detection (Ưu tiên: P1)

Là một **Nhân viên phục vụ hoặc Quản trị viên**, tôi muốn ứng dụng hoạt động mượt mà, ổn định trong suốt ca làm việc kéo dài nhiều giờ (ngay cả khi liên tục chuyển đổi giữa các tab trình duyệt hoặc ứng dụng khác), không bị phình dung lượng RAM, giật lag hay treo trình duyệt.

**Lý do cho mức độ ưu tiên này**: Ứng dụng quản lý nhà hàng chạy liên tục tại quầy POS và máy tính bảng của nhân viên. Tình trạng rò rỉ bộ nhớ từ các subscription tích lũy và timer chạy vô tội vạ sẽ làm ứng dụng cạn kiệt tài nguyên sau vài giờ vận hành.

**Kiểm thử Độc lập**:
- Mở DevTools Memory / Performance tab, mô phỏng chuyển đổi qua lại tab trình duyệt (`visibilitychange`) 50 lần liên tục: xác minh số lượng subscriptions và cuộc gọi `refreshAppState()` không bị nhân bản lũy tiến.
- Kiểm tra `sidebar-widgets.component.ts`: xác minh đồng hồ thời gian thực cập nhật chính xác mỗi giây mà không kích hoạt chu trình Change Detection trên toàn bộ cây component của ứng dụng.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** người dùng đang mở ứng dụng trên trình duyệt, **Khi (When)** người dùng chuyển sang tab khác rồi quay lại tab ứng dụng 10 lần liên tiếp, **Thì (Then)** subscription kiểm tra người dùng chỉ thực thi một lần duy nhất với `take(1)` và không sinh ra các bộ lắng nghe rò rỉ trong bộ nhớ.
2. **Cho trước (Given)** màn hình làm việc của hệ thống đang mở, **Khi (When)** quan sát hành vi của `sidebar-widgets`, **Thì (Then)** tác vụ `setInterval` chạy ngoài NgZone (`runOutsideAngular`), chỉ cập nhật cục bộ widget đồng hồ mà không làm kích hoạt lại Change Detection ở các component cha và component anh em.
3. **Cho trước (Given)** người dùng đang ở giao diện không có thanh sidebar LeptonX (ví dụ giao diện Waiter hoặc Error page), **Khi (When)** `sidebar-widgets` khởi chạy, **Thì (Then)** bộ thăm dò DOM dừng lại sau tối đa 10 lần thử và tự hủy `clearInterval`, không chạy ngầm vô hạn.

---

### User Story 3 - Xây dựng Thành phần Dùng chung: Component Phân trang `<app-pager>` & Quản lý Bàn ăn (Ưu tiên: P2)

Là một **Nhà phát triển và Người dùng ứng dụng**, tôi muốn các màn hình danh sách trong hệ thống có trải nghiệm phân trang đồng nhất, đẹp mắt theo chuẩn Cam & Trắng, và các thẻ bàn ăn hiển thị đồng bộ giữa trang Quản lý Admin và giao diện Phục vụ Waiter, giúp mã nguồn gọn gàng và dễ bảo trì.

**Lý do cho mức độ ưu tiên này**: Loại bỏ hoàn toàn mã lặp boilerplate phân trang ở 7 màn hình, xóa bỏ các đoạn mã hack DOM gây giật giao diện và đảm bảo tính nhất quán về giao diện thẻ bàn ăn.

**Kiểm thử Độc lập**:
- Kiểm tra component `<app-pager>` tại các màn hình: `/orders`, `/dishes`, `/dish-categories`, `/units`, `/ingredients`, `/recipes`, `/tables`: tất cả đều hiển thị đồng nhất nút First, Prev, Next, Last, bộ chọn kích thước trang và phản hồi mượt mà.
- Kiểm tra thẻ bàn `<app-table-card>`: hiển thị cùng kiểu dáng, màu sắc badge trạng thái và logic tính thời gian ngồi ăn tại cả `/tables` và `/waiter/tables`.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** người dùng đang xem bất kỳ bảng dữ liệu nào (Đơn hàng, Món ăn, Nguyên liệu, Đơn vị tính...), **Khi (When)** người dùng chọn kích thước trang mới (ví dụ từ 10 lên 25 bản ghi) trên `<app-pager>`, **Thì (Then)** bảng dữ liệu tải lại với 25 dòng và trang hiện tại tự động quay về trang 1.
2. **Cho trước (Given)** component `<app-pager>` nhận dữ liệu danh sách, **Khi (When)** dữ liệu được nạp xong, **Thì (Then)** bảng hiển thị vừa vặn không cần phải chạy thủ thuật `window.dispatchEvent(new Event('resize'))` hay các timer trễ.
3. **Cho trước (Given)** một bàn ăn thay đổi trạng thái qua SignalR realtime, **Khi (When)** sự kiện đến, **Thì (Then)** `TableStateService` cập nhật dữ liệu tập trung và `<app-table-card>` tự động cập nhật màu badge và nhãn trạng thái tức thì trên cả màn hình Admin lẫn Waiter.

---

### User Story 4 - Tối ưu Template, Cache & Triệt tiêu Tải Dữ liệu Khổng lồ Phía Client (Ưu tiên: P2)

Là một **Nhân viên ghi order và Nhân viên quản lý kho**, tôi muốn mở modal tạo đơn hàng và tra cứu kho nguyên liệu nhanh chóng, tức thì, không bị đơ trình duyệt do phải tải hàng nghìn bản ghi ngầm.

**Lý do cho mức độ ưu tiên này**: Modal tạo đơn tải 1000 công thức và 1000 nguyên liệu gây nghẽn mạng và tốn bộ nhớ; các getter template sinh mảng mới liên tục khiến trình duyệt phải cấp phát và thu gom rác (GC) liên tục.

**Kiểm thử Độc lập**:
- Bấm nút "Tạo đơn hàng mới" tại `/orders`: theo dõi Network tab để xác nhận không còn request tải `1000 recipes` và `1000 ingredients`.
- Kiểm tra tính năng kiểm tra tồn kho khi chọn món: hệ thống gọi API `orderService.validateStock` nhanh chóng và trả về cảnh báo thiếu hụt chính xác.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** người dùng bấm nút "Tạo đơn hàng" trên màn hình `/orders`, **Khi (When)** modal mở ra, **Thì (Then)** modal xuất hiện ngay lập tức mà không tải danh sách 1000 nguyên liệu và công thức về máy.
2. **Cho trước (Given)** người dùng thêm món vào giỏ và chỉnh số lượng món, **Khi (When)** nhấn lưu hoặc thay đổi số lượng, **Thì (Then)** hệ thống gửi yêu cầu kiểm tra tồn kho tới API máy chủ và hiển thị cảnh báo nếu không đủ nguyên liệu.
3. **Cho trước (Given)** template của các component có danh sách dropdown (`categoryOptions`, `groupedDishes`...), **Khi (When)** Change Detection kích hoạt, **Thì (Then)** các tùy chọn được đọc từ Signal `computed` hoặc mảng đã cache, không tạo ra mảng mới hay tham chiếu mới.
4. **Cho trước (Given)** cảnh báo thiếu nguyên liệu hiển thị trên giao diện tạo đơn, **Khi (When)** chuỗi cảnh báo chứa ký tự đặc biệt, **Thì (Then)** nội dung được hiển thị dưới dạng văn bản an toàn qua interpolation `{{ warning }}`, ngăn ngừa triệt để nguy cơ chèn mã XSS.

---

### User Story 5 - Chuẩn hóa Xử lý Lỗi, Quốc tế hóa (i18n) & Trải nghiệm Ngôn ngữ (Ưu tiên: P2)

Là một **Người dùng hệ thống**, tôi muốn thông báo lỗi hiển thị rõ ràng, duy nhất một lần, toàn bộ giao diện và thông báo phản hồi hiển thị đúng ngôn ngữ đã chọn (Tiếng Việt hoặc Tiếng Anh), và việc đổi ngôn ngữ diễn ra mượt mà không bị tải lại toàn bộ trang.

**Lý do cho mức độ ưu tiên này**: Tránh tình trạng người dùng bị bối rối khi thấy 2 popup lỗi đè lên nhau; bảo đảm tuân thủ nguyên tắc Quốc tế hóa (i18n) và trải nghiệm người dùng chuyên nghiệp.

**Kiểm thử Độc lập**:
- Thao tác tạo hoặc sửa một bản ghi với dữ liệu vi phạm nghiệp vụ: xác minh chỉ có 1 thông báo lỗi hiển thị (toast hoặc modal), không xuất hiện cả hai cùng lúc.
- Bấm đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh tại giao diện Waiter: trang tự động cập nhật ngôn ngữ ngay lập tức mà không làm trắng màn hình hay tải lại trang web (`location.reload`).
- Kiểm tra dữ liệu ngày tháng tạo đơn vào lúc 06:00 sáng giờ Việt Nam: ngày hiển thị đúng là ngày hôm nay, không bị lùi về hôm qua do lệch UTC.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** component chủ động bắt lỗi khi gọi API và hiển thị toast thông báo, **Khi (When)** API trả về lỗi nghiệp vụ (ví dụ HTTP 400 hoặc 409), **Thì (Then)** chỉ có duy nhất thông báo toast của component xuất hiện, modal thông báo lỗi mặc định của ABP bị bỏ qua thông qua `{ skipHandleError: true }`.
2. **Cho trước (Given)** người dùng thao tác các hành động (nhập kho, điều chỉnh, đổi trạng thái đơn, thao tác phục vụ), **Khi (When)** thông báo xuất hiện, **Thì (Then)** 100% nội dung thông báo hiển thị đúng theo ngôn ngữ hiện tại và được lấy từ từ điển `vi.json` hoặc `en.json`.
3. **Cho trước (Given)** nhân viên phục vụ đang ở màn hình Waiter, **Khi (When)** bấm chuyển ngôn ngữ từ Tiếng Việt sang Tiếng Anh, **Thì (Then)** toàn bộ nhãn và trạng thái đổi sang Tiếng Anh mượt mà mà không tải lại trang trình duyệt (`window.location.reload()`).
4. **Cho trước (Given)** giá trị tiền tệ hiển thị trên các màn hình thanh toán và đơn hàng, **Khi (When)** hiển thị số tiền, **Thì (Then)** sử dụng pipe `currency:'VND'` chuẩn hóa, hiển thị ký hiệu đồng bộ và phân tách hàng nghìn chính xác.

---

### User Story 6 - Tái cấu trúc CSS/SCSS, Dọn dẹp `!important` & Bảo vệ Service Proxies (Ưu tiên: P3)

Là một **Kỹ sư bảo trì hệ thống và Lập trình viên Frontend**, tôi muốn mã nguồn CSS gọn gàng, có tính module hóa cao, và các service proxy ABP được tách biệt rõ ràng với mã tùy biến, để hệ thống dễ nâng cấp và không bị mất mã nguồn khi đồng bộ API.

**Lý do cho mức độ ưu tiên này**: Tệp SCSS 100KB với hơn 1800 `!important` gây khó khăn cho việc tùy biến giao diện và làm chậm thời gian biên dịch; sửa trực tiếp trong thư mục `proxy/` gây rủi ro mất code nghiêm trọng khi chạy lệnh CLI của ABP.

**Kiểm thử Độc lập**:
- Kiểm tra dung lượng tệp `table.component.scss`: giảm xuống dưới 30KB.
- Chạy thử nghiệm kiểm tra tính toàn vẹn của thư mục `proxy/`: toàn bộ code tùy biến nằm ngoài `proxy/`, có thể chạy `abp generate-proxy` an toàn.
- Kiểm tra cấu hình giờ mở cửa: thay đổi giá trị trong `business-hours.constant.ts` phản ánh đồng bộ trên toàn bộ 4 màn hình liên quan.

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** cấu trúc mã nguồn thư mục `angular/src/app/proxy/`, **Khi (When)** lập trình viên kiểm tra, **Thì (Then)** toàn bộ các service trong thư mục này đều giữ nguyên cấu trúc sinh tự động của ABP, mọi hàm tùy biến được chuyển sang các service bao bọc riêng tại `core/services/`.
2. **Cho trước (Given)** tập tin kiểu dáng `table.component.scss`, **Khi (When)** biên dịch, **Thì (Then)** các quy tắc CSS dùng chung được đưa vào component con hoặc stylesheet chung, kích thước file giảm thiểu đáng kể và loại bỏ các chỉ thị `!important` lạm dụng.
3. **Cho trước (Given)** hằng số giờ mở cửa nhà hàng, **Khi (When)** ứng dụng khởi chạy, **Thì (Then)** các màn hình hiển thị giờ hoạt động (`sidebar-widgets`, `table`, `home`, `waiter-layout`) đều đọc chung từ `RESTAURANT_BUSINESS_HOURS`.

---

### Các Trường hợp Ngoại lệ (Edge Cases)

- **EC-001: Mạng chập chờn khi chuyển trang phân trang**: Nếu kết nối mạng bị gián đoạn khi người dùng nhấn chuyển trang trên `<app-pager>`, component hiển thị thông báo lỗi thân thiện, giữ nguyên vị trí trang trước đó và cho phép bấm thử lại mà không làm vỡ giao diện bảng.
- **EC-002: Tìm kiếm trả về kết quả rỗng (0 bản ghi)**: Khi bộ lọc tìm kiếm đơn hàng không khớp bản ghi nào (`totalCount = 0`), bảng hiển thị trạng thái "Không tìm thấy dữ liệu" đẹp mắt, `<app-pager>` ẩn các nút chuyển trang hoặc vô hiệu hóa hợp lý mà không ném lỗi NaN / divide by zero.
- **EC-003: Thu ngân chưa được gán bất kỳ quyền quản trị nào**: Khi Thu ngân đăng nhập nhưng không có quyền xem bảng quản lý bàn Admin, hệ thống tự động nhận diện và chuyển hướng an toàn sang giao diện bàn của Waiter (`/waiter/tables`) hoặc trang thông báo phù hợp thay vì chuyển tới route chết `/table/layout`.
- **EC-004: Thay đổi ngôn ngữ liên tục trong thời gian ngắn**: Nếu người dùng bấm đổi ngôn ngữ nhiều lần liên tiếp, `sessionState` xử lý tuần tự, các Signal trạng thái cập nhật đồng bộ mà không gây xung đột chuỗi dịch hay treo giao diện.
- **EC-005: Dữ liệu ngày tháng ở múi giờ đặc thù**: Khi người dùng thao tác ở ranh giới nửa đêm (23:59 đến 00:01), logic định dạng ngày tháng địa phương đảm bảo ngày được ghi nhận chính xác theo giờ hệ điều hành của máy khách, không bị nhảy ngược sang ngày hôm trước do chuyển đổi chuỗi UTC.
- **EC-006: Trình duyệt cũ không hỗ trợ đầy đủ các API hiện đại**: Các tác vụ tối ưu hóa đảm bảo tương thích ngược tốt với trình duyệt chuẩn của máy tính bảng nhà hàng, có fallback an toàn cho ResizeObserver và NgZone handlers.

---

## Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

#### Nhóm 1: Khắc phục Phân trang & Điều hướng
- **FR-001**: Hệ thống PHẢI loại bỏ hoàn toàn việc lọc mảng trên client hiện tại và ghi đè `totalCount = items.length` tại `order.component.ts`. Tham số tìm kiếm `filter` và trạng thái `status` PHẢI được truyền vào `streamCreator` của ABP `ListService`.
- **FR-002**: Hệ thống PHẢI bảo toàn giá trị `totalCount` do máy chủ trả về trong toàn bộ vòng đời phân trang của `order.component.ts`.
- **FR-003**: Hệ thống PHẢI xóa bỏ hoàn toàn đường dẫn lỗi `/table/layout` khỏi toàn bộ mã nguồn Angular (`app.component.ts`, `user-role-navigation.service.ts`, `dashboard.guard.ts`).
- **FR-004**: Hệ thống PHẢI phân luồng động tuyến đường mặc định của Thu ngân (Cashier): nếu có quyền quản trị/tạo bàn (`TooHungry.Tables.Create` hoặc quyền Admin) thì vào `/tables` (Admin); nếu chỉ có quyền thao tác phục vụ/thanh toán thì vào `/waiter/tables`.
- **FR-005**: Hệ thống PHẢI duy trì tuyến đường Wildcard `**` chuyển hướng mọi URL không tồn tại tới trang lỗi 404 thân thiện.

#### Nhóm 2: Triệt tiêu Rò rỉ Bộ nhớ & Tối ưu Change Detection
- **FR-006**: Hệ thống PHẢI bổ sung toán tử `.pipe(filter(u => !!u?.isAuthenticated), take(1))` cho việc lắng nghe `currentUser` trong sự kiện `visibilitychange` tại `app.component.ts`.
- **FR-007**: Hệ thống PHẢI thực thi tác vụ đếm thời gian 1 giây tại `sidebar-widgets.component.ts` bên ngoài Angular Zone (`NgZone.runOutsideAngular`), chỉ kích hoạt cập nhật giao diện khi thực sự có thay đổi hiển thị.
- **FR-008**: Hệ thống PHẢI giới hạn số lần thử tìm kiếm DOM LeptonX tại `sidebar-widgets.component.ts` tối đa 10 lần và tự động hủy bỏ interval 300ms, ngăn ngừa rò rỉ bộ nhớ vô tận.
- **FR-009**: Hệ thống PHẢI chuẩn hóa cơ chế quản lý trạng thái, hạn chế tối đa việc gọi thủ công `cdr.detectChanges()` rải rác trong các callback subscription và chuyển đổi sang Angular Signals hoặc `async` pipe.

#### Nhóm 3: Thành phần Dùng chung & Tái cấu trúc
- **FR-010**: Hệ thống PHẢI xây dựng standalone component phân trang dùng chung `<app-pager>` tuân thủ bảng màu Cam & Trắng, hỗ trợ cả Two-Way Binding `[(page)]`/`[(pageSize)]` và ABP `ListService` Adapter để tái sử dụng linh hoạt cho cả Table lẫn Grid Card.
- **FR-011**: Hệ thống PHẢI thay thế mã phân trang sao chép lặp lại ở 7 màn hình (`order`, `dish`, `dish-category`, `unit`, `ingredient`, `recipe`, `table`) bằng `<app-pager>`.
- **FR-012**: Hệ thống PHẢI xóa bỏ triệt để mã hack DOM `window.dispatchEvent(new Event('resize'))` và các bộ hẹn giờ `setTimeout` cưỡng ép tính toán lại bảng.
- **FR-013**: Hệ thống PHẢI xây dựng `TableStateService`, `<app-table-card>` và `TableStatusPipe` dùng chung giữa hai phân hệ `/tables` và `/waiter/tables`.

#### Nhóm 4: Tối ưu Template & Triệt tiêu Tải Dữ liệu Khổng lồ
- **FR-014**: Hệ thống PHẢI xóa bỏ việc tải 1000 recipes và 1000 ingredients tại `order.component.ts`, thay thế bằng API máy chủ `orderService.validateStock` với cơ chế kiểm tra Realtime có Debounce 300ms khi chỉnh giỏ hàng và kiểm tra chốt chặn lần cuối khi bấm Lưu đơn.
- **FR-015**: Hệ thống PHẢI loại bỏ việc client tự gửi `unitPrice` và `totalAmount` trong DTO tạo/sửa đơn hàng, chỉ gửi danh sách `{ dishId, quantity }`.
- **FR-016**: Hệ thống PHẢI thay thế các getter template sinh mảng mới mỗi chu kỳ Change Detection bằng các Signal `computed()` hoặc memoized cache.
- **FR-017**: Hệ thống PHẢI loại bỏ logic tự sinh mã đơn `ORD-...` ngẫu nhiên ở client tại `order.component.ts`, chuyển giao toàn quyền quản lý mã đơn cho máy chủ.
- **FR-018**: Hệ thống PHẢI thay thế thẻ `[innerHTML]` hiển thị cảnh báo nguyên liệu tại `order.component.html` bằng chuỗi nội suy text an toàn chống XSS.

#### Nhóm 5: Chuẩn hóa Xử lý Lỗi, i18n & SCSS
- **FR-019**: Hệ thống PHẢI truyền tùy chọn `{ skipHandleError: true }` khi các component tự bắt lỗi để ngăn chặn việc hiển thị đồng thời 2 thông báo lỗi (modal ABP và toast component).
- **FR-020**: Hệ thống PHẢI chuyển đổi 100% các chuỗi thông báo và nhãn giao diện hardcode tiếng Việt sang từ điển đa ngôn ngữ trong `vi.json` và `en.json`.
- **FR-021**: Hệ thống PHẢI chuyển đổi ngôn ngữ trong `waiter-layout.component.ts` một cách mượt mà thông qua `sessionState.setLanguage(...)`, không sử dụng `window.location.reload()`.
- **FR-022**: Hệ thống PHẢI định dạng ngày tháng hiển thị an toàn theo múi giờ địa phương, không sử dụng `toISOString().split('T')[0]` gây sai lệch ngày giữa 0h và 7h sáng.
- **FR-023**: Hệ thống PHẢI di dời toàn bộ mã tùy biến khỏi thư mục `angular/src/app/proxy/` sang các service bao bọc riêng biệt để bảo vệ mã nguồn khi chạy `abp generate-proxy`.
- **FR-024**: Hệ thống PHẢI tối ưu hóa tập tin `table.component.scss` bằng cách tách CSS thẻ bàn vào `<app-table-card>` và CSS modal vào modal con (giảm dung lượng xuống dưới 25KB), dọn dẹp triệt để các chỉ thị `!important` và tập trung hóa cấu hình giờ mở cửa nhà hàng vào `RESTAURANT_BUSINESS_HOURS`.

---

### Các Thành phần Chính (Key Components & Services)

- **`<app-pager>` (`shared/components/pager/pager.component.ts`)**:
  - Component standalone dùng chung chịu trách nhiệm điều khiển phân trang cho tất cả các bảng dữ liệu trong hệ thống.
  - Quản lý trang hiện tại, kích thước trang, số lượng bản ghi hiển thị và phát tín hiệu chuyển trang mượt mà.
- **`TableStateService` (`shared/services/table-state.service.ts`)**:
  - Quản lý trạng thái bảng dữ liệu bàn ăn, kết nối sự kiện thời gian thực SignalR, và tính toán số lượng bàn theo từng trạng thái bằng Angular Signals.
- **`<app-table-card>` (`shared/components/tables/table-card/table-card.component.ts`)**:
  - Component hiển thị thẻ bàn ăn tái sử dụng cho cả giao diện Quản lý Admin và giao diện Phục vụ Waiter.
- **`TableStatusPipe` (`shared/pipes/table-status.pipe.ts`)**:
  - Pipe chuyển đổi mã enum trạng thái bàn thành nhãn văn bản đa ngôn ngữ và lớp màu badge tương ứng.
- **`RESTAURANT_BUSINESS_HOURS` (`shared/constants/business-hours.constant.ts`)**:
  - Hằng số cấu hình khung giờ phục vụ của nhà hàng (mở cửa, đóng cửa, các ca làm việc) dùng chung cho toàn bộ frontend.

---

## Tiêu chí Thành công (Success Criteria)

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% các lỗi phân trang tại màn hình Quản lý đơn hàng `/orders` được giải quyết triệt để: người dùng tìm kiếm, lọc trạng thái và chuyển trang 2, 3, 4... chính xác dựa trên dữ liệu máy chủ trả về.
- **SC-002**: 0% rò rỉ bộ nhớ (Memory leaks) phát sinh từ `app.component.ts` và `sidebar-widgets.component.ts` sau 50 lần chuyển đổi tab hoặc sau 2 giờ vận hành liên tục.
- **SC-003**: 100% đường dẫn lỗi `/table/layout` được loại bỏ hoàn toàn khỏi ứng dụng; Thu ngân đăng nhập chuyển hướng thành công vào trang làm việc hợp lệ.
- **SC-004**: Triệt tiêu 100% việc tải 1000 recipes và 1000 ingredients ở client khi mở modal tạo đơn; thời gian mở modal giảm xuống dưới 100ms.
- **SC-005**: 100% các khối mã phân trang boilerplate bị sao chép ở 7 màn hình được thay thế bằng component dùng chung `<app-pager>`; loại bỏ 100% mã hack `window.dispatchEvent(resize)`.
- **SC-006**: Dung lượng tệp `table.component.scss` giảm ít nhất 65% (từ ~100KB xuống dưới 30KB); số lượng chỉ thị `!important` trong styles giảm đáng kể.
- **SC-007**: 100% chuỗi thông báo và nhãn giao diện hiển thị đúng song ngữ qua `vi.json` và `en.json`; việc đổi ngôn ngữ tại giao diện Waiter không còn bị giật hay reload trang (`window.location.reload()`).
- **SC-008**: 100% các unit tests của frontend và ứng dụng Angular biên dịch thành công (`npm run build` không phát sinh lỗi cú pháp hay cảnh báo đứt gãy).

---

## Các Giả định (Assumptions)

- **Môi trường & Nền tảng**: Hệ thống chạy trên nền tảng Angular phiên bản hiện đại (Angular 18+), sử dụng Standalone Components, Signal State và ABP Framework 9.x Theme Shared.
- **API Máy chủ Hỗ trợ Phân trang**: API Quản lý đơn hàng Backend đã hỗ trợ (hoặc tương thích) với các tham số lọc phân trang `filter` và `status` theo chuẩn `PagedAndSortedResultRequestDto`.
- **Hỗ trợ Xác thực Tồn kho từ Server**: API `orderService.validateStock` đã hoạt động ổn định và sẵn sàng phục vụ cho màn hình Quản lý đơn hàng tương tự như giao diện Waiter Order.
- **Múi giờ Vận hành**: Nhà hàng hoạt động chủ yếu theo múi giờ Việt Nam (UTC+7), mọi tính toán ngày tháng cục bộ dựa trên múi giờ thực tế của thiết bị người dùng.
- **Bảo toàn Nhận diện Thiết kế**: Tất cả các component tái cấu trúc và tạo mới (`<app-pager>`, `<app-table-card>`) đều tuân thủ nghiêm ngặt bảng màu nhận diện Cam & Trắng đã phê chuẩn trong Hiến pháp dự án.
