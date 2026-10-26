# Tài liệu Nghiên cứu Kỹ thuật (Technical Research): RM-024 Tối ưu Hiệu năng & Tái cấu trúc Frontend Angular

**Mã Tính năng**: `RM-024`  
**Ngày thực hiện**: 2026-10-23  
**Dự án**: `Acme.TooHungry` (Angular 18+ / ABP Framework 9.x)  
**Tài liệu liên quan**: [spec.md](spec.md) | [plan.md](plan.md)

---

## Tóm tắt Nghiên cứu & Định hướng Kỹ thuật

Nghiên cứu này tập trung vào việc giải quyết toàn diện 24 vấn đề hiệu năng, rò rỉ bộ nhớ, tái sử dụng component và chuẩn hóa kiến trúc Frontend Angular đã được xác định từ tài liệu `CODE_REVIEW.md`. Các giải pháp kỹ thuật dưới đây tuân thủ nghiêm ngặt Hiến pháp dự án (DDD, ABP Layering, UI/UX Cam & Trắng, i18n song ngữ).

---

## 1. Phân trang Máy chủ (Server-driven Pagination) & Điều hướng Tuyến đường

### Vấn đề Phát hiện (FE #1, FE #2)
- Tại `order.component.ts:167-185`, hàm `this.list.hookToQuery(streamCreator).subscribe(...)` nhận kết quả phân trang từ server (mặc định 10 dòng), nhưng sau đó lại dùng `items.filter(...)` theo từ khóa tìm kiếm và trạng thái rồi ghi đè `totalCount = items.length`. Kết quả: nếu tìm kiếm hoặc lọc, bảng chỉ lọc trong 10 dòng hiện tại; người dùng không thể chuyển sang trang 2 để xem các đơn hàng tiếp theo.
- Tại `app.component.ts:63`, `user-role-navigation.service.ts:138`, `dashboard.guard.ts:42,67`: Khi nhân viên Thu ngân (Cashier) đăng nhập, mã điều hướng chuyển hướng tới `/table/layout`. Tuyến đường này hoàn toàn không tồn tại trong `app.routes.ts`, dẫn đến lỗi điều hướng hoặc chuyển trang trắng.

### Giải pháp Kỹ thuật
1. **Phía Backend (`Acme.TooHungry.Application.Contracts` & `Application`)**:
   - Mở rộng DTO `GetOrdersInputDto : PagedAndSortedResultRequestDto`:
     ```csharp
     public class GetOrdersInputDto : PagedAndSortedResultRequestDto
     {
         public string? Filter { get; set; }
         public OrderStatus? Status { get; set; }
     }
     ```
   - Nâng cấp `IOrderAppService.GetListAsync(GetOrdersInputDto input)` và `OrderAppService.GetListAsync(GetOrdersInputDto input)`: Lọc theo `OrderNumber`, `Note` hoặc `TableName` nếu có `Filter`, lọc theo `Status` nếu có `Status`, sau đó mới thực hiện `CountAsync` và `PageBy`.
2. **Phía Frontend (`order.component.ts`)**:
   - Trong `streamCreator`:
     ```typescript
     const streamCreator = (query: PagedAndSortedResultRequestDto) =>
       this.orderService.getList({
         ...query,
         filter: this.searchTerm?.trim() || undefined,
         status: this.selectedStatus !== '' ? Number(this.selectedStatus) : undefined,
       });
     ```
   - Trong callback subscribe: Giữ nguyên `this.data = res;` (với `totalCount` thực từ máy chủ), loại bỏ hoàn toàn các dòng `items.filter(...)` và `this.data = { items, totalCount: items.length }`.
3. **Chuẩn hóa Tuyến đường Thu ngân**:
   - Đổi toàn bộ điều hướng `/table/layout` thành `/tables` (nếu Thu ngân có quyền quản lý bàn) hoặc `/waiter/tables` (nếu Thu ngân đồng thời là nhân viên phục vụ bàn).
   - Bảo toàn tuyến đường Wildcard `**` trỏ tới `ErrorPageComponent` với mã lỗi 404 để bắt trọn mọi URL gõ sai.

---

## 2. Triệt tiêu Rò rỉ Bộ nhớ (Memory Leaks) & Tối ưu Vòng lặp Change Detection

### Vấn đề Phát hiện (FE #3, FE #8, FE #10)
- `app.component.ts:80`: Lắng nghe sự kiện `visibilitychange` của trình duyệt. Mỗi lần người dùng chuyển tab và quay lại, một subscription `this.configState.getOne$('currentUser').subscribe(...)` mới lại được tạo mà không có toán tử giới hạn (`take(1)`), dẫn đến việc rò rỉ bộ nhớ tăng dần theo thời gian sử dụng và gọi `refreshAppState()` dồn dập N lần.
- `sidebar-widgets.component.ts:84-109`: Timer `setInterval(1000)` chạy bên trong Angular NgZone làm kích hoạt Change Detection của toàn bộ ứng dụng mỗi giây. Interval thăm dò DOM LeptonX `setInterval(300)` có điều kiện dừng `injected && attempts > 10`, nếu layout không có sidebar (`injected = false`) thì interval này chạy vĩnh viễn không bao giờ dừng.

### Giải pháp Kỹ thuật
1. **Triệt tiêu Memory Leak `app.component.ts`**:
   - Áp dụng toán tử giới hạn một lần phát tín hiệu:
     ```typescript
     this.configState.getOne$('currentUser').pipe(
       filter(user => !!user?.isAuthenticated),
       take(1)
     ).subscribe(() => {
       this.configState.refreshAppState().pipe(take(1)).subscribe();
     });
     ```
2. **Tối ưu Hóa NgZone trong `sidebar-widgets.component.ts`**:
   - Sử dụng `NgZone.runOutsideAngular` để đưa các tác vụ hẹn giờ lặp lại ra ngoài vùng Change Detection của Angular:
     ```typescript
     this.ngZone.runOutsideAngular(() => {
       this.timerId = setInterval(() => {
         this.updateClock();
         this.ngZone.run(() => this.cdr.markForCheck());
       }, 1000);
     });
     ```
   - Sửa điều kiện dừng thăm dò DOM:
     ```typescript
     this.observerId = setInterval(() => {
       attempts++;
       const injected = this.tryInjectWidgets();
       if (injected || attempts >= 10) {
         clearInterval(this.observerId);
       }
     }, 300);
     ```

---

## 3. Thành phần Dùng chung: Component Phân trang `<app-pager>` & Quản lý Bàn ăn

### Vấn đề Phát hiện (FE #11, FE #13, FE #22)
- Mã phân trang (nút First, Prev, Next, Last, PageSize Dropdown, tính toán tổng số trang) bị sao chép lặp lại ở 7 màn hình (`order`, `dish`, `dish-category`, `unit`, `ingredient`, `recipe`, `table`).
- Kèm theo đó là thủ thuật hack DOM cưỡng bức vẽ lại bảng: `window.dispatchEvent(new Event('resize'))` kết hợp 3 timer `requestAnimationFrame`, `setTimeout(50)`, `setTimeout(200)` gây giật màn hình và tốn CPU.
- Tại `table.component.ts` và `waiter-tables.component.ts`: Trùng lặp hoàn toàn việc đăng ký lắng nghe SignalR `tableStatusChanged$`, 5 hàm computed đếm bàn (`availableCount`, `occupiedCount`, `reservedCount`, `cleaningCount`, `inactiveCount`), logic xác định màu badge và nhãn trạng thái.

### Giải pháp Kỹ thuật
1. **Component Phân trang Dùng chung `<app-pager>`**:
   - Tạo standalone component `angular/src/app/shared/components/pager/pager.component.ts`:
     - Nhận đầu vào: `totalCount: number`, `pageSize: number`, `currentPage: number`, `pageSizeOptions: number[]`.
     - Phát sự kiện: `pageChange: EventEmitter<number>`, `pageSizeChange: EventEmitter<number>`.
     - Tích hợp trực tiếp với ABP `ListService` thông qua hai chiều binding.
     - Thiết kế chuẩn Cam & Trắng: Nút bấm bo tròn 8px, hiệu ứng hover nhẹ, số trang active màu cam `#EA580C`, nền `#FFF3E8`.
     - Loại bỏ triệt để đoạn mã hack `window.dispatchEvent(new Event('resize'))` và các timer trễ.
2. **Dịch vụ Trạng thái Bàn `TableStateService`**:
   - Tạo `angular/src/app/shared/services/table-state.service.ts`:
     - Nắm giữ Signal danh sách bàn: `allTables = signal<TableDto[]>([])`.
     - Quản lý tập trung kết nối SignalR: Tự động cập nhật `allTables` khi nhận sự kiện `tableStatusChanged$`.
     - Cung cấp các computed signals thống kê: `availableTables`, `occupiedTables`, `reservedTables`, `cleaningTables`, `inactiveTables` cùng các số đếm tương ứng.
3. **Thành phần Thẻ Bàn `<app-table-card>` & Pipe Trạng thái `TableStatusPipe`**:
   - Tạo `angular/src/app/shared/components/tables/table-card/table-card.component.ts` hiển thị thẻ bàn ăn với các thông tin: Tên bàn, khu vực, sức chứa, badge trạng thái, thời gian ngồi ăn và các nút hành động theo quyền hạn.
   - Tạo `angular/src/app/shared/pipes/table-status.pipe.ts` chuyển đổi mã `TableStatus` sang nhãn ngôn ngữ và class CSS màu sắc tương ứng.

---

## 4. Tối ưu Template, Cache & Triệt tiêu Tải Dữ liệu Khổng lồ Phía Client

### Vấn đề Phát hiện (FE #5, FE #12, FE #18, FE #20, FE #23)
- `order.component.ts:190-194`: Mỗi khi mở modal tạo đơn hàng, hàm `loadRecipesAndIngredients()` tải 1000 recipes và 1000 ingredients về client chỉ để tự tính toán và cảnh báo thiếu nguyên liệu trong giỏ hàng.
- `order.component.ts:413`: Client tự sinh mã đơn ngẫu nhiên `ORD-` kèm chuỗi random 6 chữ số, gây nguy cơ xung đột mã đơn hàng.
- `order.component.ts:624`: Form giỏ hàng lưu `unitPrice` và gửi lên máy chủ (đi cặp với lỗ hổng Client tự đặt giá Backend #2).
- `order.component.html:642`: Sử dụng `<span [innerHTML]="warning"></span>` với chuỗi chứa tên nguyên liệu do người dùng tạo, tiềm ẩn lỗ hổng bảo mật XSS.
- Các hàm getter trong template (`categoryOptions`, `groupedDishes`, `pageSizeOptions`) sinh mảng mới mỗi lần Change Detection chạy; thuật toán sắp xếp tại `inventory.component.ts` có độ phức tạp O(n^2).

### Giải pháp Kỹ thuật
1. **Sử dụng API Kiểm tra Tồn kho từ Máy chủ**:
   - Xóa bỏ hoàn toàn hàm `loadRecipesAndIngredients()` và việc tải 1000 bản ghi về client.
   - Khi người dùng thêm món hoặc lưu đơn, gọi API máy chủ `this.orderService.validateStock({ items })` (API đã được chuẩn hóa tại RM-022 và áp dụng tại `waiter-order.component.ts`).
2. **Server-side Order Number & Triệt tiêu Gửi UnitPrice**:
   - Loại bỏ logic sinh mã đơn ngẫu nhiên tại client; để trống `orderNumber` khi tạo mới để máy chủ tự sinh theo chuỗi thời gian hoặc sequence duy nhất.
   - Loại bỏ `unitPrice` và `totalAmount` khỏi payload gửi lên server khi tạo/sửa đơn hàng.
3. **Chống Tấn công XSS**:
   - Thay thế `[innerHTML]="warning"` bằng string interpolation an toàn: `<span class="stock-warning-text">{{ warning }}</span>`.
4. **Tối ưu Template với Angular Signals & Map Tra cứu**:
   - Chuyển đổi các getter tạo mảng mới sang `computed()` signals hoặc cache memoized được khởi tạo một lần khi dữ liệu nguồn thay đổi.
   - Tại bảng tồn kho: Tạo trước `Map<string, IngredientDto>` để tra cứu O(1), thay thế việc lặp so sánh O(n^2).

---

## 5. Chuẩn hóa Xử lý Lỗi, Quốc tế hóa (i18n) & Múi giờ Địa phương

### Vấn đề Phát hiện (FE #14, FE #15, FE #16, FE #17, FE #34)
- Khi gọi API lỗi, cả modal lỗi mặc định của ABP và thông báo `toaster.error(...)` của component cùng hiện lên đè lên nhau (hiển thị 2 lần). Component đọc thông báo lỗi từ `err?.error?.message` trong khi cấu trúc lỗi ABP nằm ở `err?.error?.error?.message`.
- Chuỗi toast tiếng Việt viết cứng (hardcode) tại nhiều vị trí trong `inventory.ts`, `order.ts`, `ingredient.ts`.
- `waiter-layout.component.ts:252`: Đổi ngôn ngữ sử dụng `setTimeout(() => window.location.reload(), 150)` gây giật trắng màn hình; định dạng tiền tệ ghép chuỗi thủ công `' đ'`.
- `toISOString().split('T')[0]` lấy ngày theo UTC, dẫn đến việc vào khung giờ từ 00:00 đến 06:59 sáng giờ Việt Nam (UTC+7), ngày bị tính lùi về hôm qua.
- Đăng ký lồng nhau 3 tầng (Nested Subscribes) tại `waiter-tables.ts` và `inventory.ts`.

### Giải pháp Kỹ thuật
1. **Chống Thông báo Lỗi Kép**:
   - Truyền `{ skipHandleError: true }` vào cấu hình request của ABP `RestService` khi component muốn tự kiểm soát và hiển thị lỗi.
   - Trích xuất thông điệp lỗi chính xác:
     ```typescript
     const errorMsg = err?.error?.error?.message || err?.error?.message || this.localizationService.instant('::DefaultErrorMessage');
     ```
2. **Đổi Ngôn ngữ Không Giật Màn hình**:
   - Loại bỏ `window.location.reload()`. Sử dụng `this.sessionState.setLanguage(langCode)` của ABP. Các thành phần giao diện tự động cập nhật ngôn ngữ thông qua cơ chế phản ứng ngầm.
   - Sử dụng Angular pipe `{{ amount | currency:'VND':'symbol':'1.0-0' }}` thay thế cho chuỗi thủ công.
3. **Định dạng Ngày Địa phương An toàn**:
   - Thay thế việc cắt chuỗi UTC bằng hàm định dạng ngày an toàn theo múi giờ địa phương của trình duyệt:
     ```typescript
     export function formatLocalDate(date: Date = new Date()): string {
       const year = date.getFullYear();
       const month = String(date.getMonth() + 1).padStart(2, '0');
       const day = String(date.getDate()).padStart(2, '0');
       return `${year}-${month}-${day}`;
     }
     ```
4. **Lập trình Phản ứng RxJS Khử Lồng nhau (Flattening Operators)**:
   - Thay thế nested subscribes bằng toán tử declarative:
     ```typescript
     this.confirmation.warn('...', '...').pipe(
       filter(status => status === Confirmation.Status.confirm),
       switchMap(() => this.inventoryService.discardBatch(batchId, input))
     ).subscribe({
       next: () => this.handleSuccess(),
       error: (err) => this.handleError(err)
     });
     ```

---

## 6. Tối ưu Hóa SCSS, Dọn dẹp `!important` & Bảo vệ Proxy

### Vấn đề Phát hiện (FE #6, FE #24, FE #30, FE #32)
- `table.component.scss` có dung lượng lên tới ~100KB với hơn 300 chỉ thị `!important`. Toàn bộ `styles.scss` chứa hơn 1800 `!important`.
- Các file trong `angular/src/app/proxy/` (đặc biệt là `ingredient.service.ts` và `recipe.service.ts`) bị viết thêm các hàm tùy biến bằng tay. Khi chạy lệnh sinh proxy tự động `abp generate-proxy`, toàn bộ code tự viết sẽ bị xóa mất.
- `custom-toaster.service.ts:30-38` can thiệp vào thuộc tính nội bộ private của ABP `(this as any).toasts` và `(this as any).containerComponentRef`.
- Giờ mở cửa nhà hàng (9h - 23h) bị hardcode tại 4 file riêng biệt.

### Giải pháp Kỹ thuật
1. **Tái cấu trúc SCSS & Dọn dẹp `!important`**:
   - Tách các khối style thẻ bàn và modal ra component con `<app-table-card>` và các stylesheet con.
   - Giảm dung lượng `table.component.scss` xuống dưới 30KB.
   - Thay thế các chỉ thị `!important` bằng cách tăng tính cụ thể (CSS specificity) hợp lý và tận dụng biến SCSS tokens.
2. **Độc lập Hóa Service Proxy**:
   - Giữ nguyên vẹn mã tự động sinh trong `angular/src/app/proxy/`.
   - Di dời các hàm tùy biến (như `getList` hỗ trợ boolean `includeInactive`) sang các service mở rộng tại `angular/src/app/shared/services/` (ví dụ `ExtendedIngredientService`).
3. **An toàn Hóa Custom Toaster**:
   - Sử dụng các tùy chọn chính thức của ABP `Toaster.ToastOptions` (`life: 3500`), cấu hình vị trí toast qua CSS global container thay vì can thiệp `(this as any)`.
4. **Hằng số Cấu hình Giờ Hoạt động**:
   - Tạo `angular/src/app/shared/constants/business-hours.constant.ts` chứa hằng số `RESTAURANT_BUSINESS_HOURS`, dùng chung cho `sidebar-widgets`, `table`, `home`, `waiter-layout`.

---

## Kết luận & Quyết định Kiến trúc

Tất cả 8 quyết định kỹ thuật trên đều có tính khả thi 100%, không làm gián đoạn nghiệp vụ đang chạy, tương thích hoàn toàn với kiến trúc ABP Framework và đã sẵn sàng để lập mô hình dữ liệu (`data-model.md`), hợp đồng giao diện (`contracts/`) và kế hoạch triển khai chi tiết (`plan.md`).
