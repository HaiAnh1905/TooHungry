# Nghiên cứu Kỹ thuật (Technical Research): RM-020 Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)

**Tính năng**: `RM-020 — Phân hệ & Bố cục Thủ kho (Inventory Keeper Portal & Layout)`  
**Nhánh**: `020-rm-020-inventory-keeper-layout` | **Ngày**: 2026-10-19 | **Đặc tả**: [spec.md](spec.md)

---

## 1. Kiến trúc Bố cục Toàn trang & Tuyến đường Con trong Angular 19

### Vấn đề Kỹ thuật
Theo mặc định, ABP Framework cấu hình layout quản trị chung (`eLayoutType.application`) chứa thanh Topbar và Sidebar admin đầy đủ của hệ thống. Đối với phân hệ của Thủ kho (`Inventory Keeper`), yêu cầu nghiệp vụ bắt buộc phải ẩn hoàn toàn thanh điều hướng quản trị cồng kềnh này để thay bằng bố cục tinh gọn 3 vùng (Topbar quầy kho, Dynamic Sidebar, Main Content) tương tự như phân hệ Waiter (RM-015).

### Giải pháp Kiến trúc
1. **Thiết lập Tuyến đường Cơ sở với Layout Rỗng (`eLayoutType.empty`)**:
   - Định nghĩa route cha `/inventory-keeper` với `data: { layout: eLayoutType.empty }`.
   - Áp dụng `canActivate: [authGuard, inventoryKeeperAuthGuard]` tại tuyến đường cha để bảo vệ toàn bộ cụm tuyến đường con.
2. **Cấu trúc Tuyến đường Con (Sub-routing)**:
   - `path: ''`: Redirect về `dashboard` (`pathMatch: 'full'`).
   - `path: 'dashboard'`: `InventoryKeeperDashboardComponent` (Bảng điều khiển FEFO & Cảnh báo khẩn cấp).
   - `path: 'batches'`: `InventoryKeeperBatchesComponent` (Danh mục lô hàng & Thao tác 1 chạm).
   - `path: 'transactions'`: `InventoryKeeperTransactionsComponent` (Nhật ký biến động xuất nhập tồn & Kiểm kê).
   - `path: '**'`: Redirect về `dashboard`.
3. **Tuyến đường Bí danh (Route Alias)**:
   - `path: 'keeper'` -> redirect về `/inventory-keeper`.

---

## 2. Quản lý Sidebar Ngữ cảnh Động qua Mô hình Service-driven Portal

### Vấn đề Kỹ thuật
Khi thủ kho chuyển đổi giữa các tab con (`/dashboard`, `/batches`, `/transactions`), nội dung Sidebar cần thay đổi linh hoạt:
- Tại trang Dashboard: Hiển thị bộ lọc cảnh báo nhanh (Lô cận date, Thiếu tồn, Quá hạn).
- Tại trang Batches: Hiển thị thanh tìm kiếm mã lô/nguyên liệu, nút quét mã vạch, bộ lọc nhiệt độ bảo quản (Khô, Lạnh, Đông) và bộ lọc trạng thái lô.
- Tại trang Transactions: Hiển thị bộ lọc theo loại giao dịch (Nhập kho, Xuất món POS, Xuất hủy, Kiểm kê).

### Giải pháp Kiến trúc
Áp dụng **Template Portal Pattern** qua Angular Signals / RxJS:
- Xây dựng `InventoryKeeperSidebarService`:
  ```typescript
  @Injectable({ providedIn: 'root' })
  export class InventoryKeeperSidebarService {
    private readonly sidebarTemplate$ = new BehaviorSubject<TemplateRef<any> | null>(null);

    setTemplate(template: TemplateRef<any> | null): void {
      this.sidebarTemplate$.next(template);
    }

    getTemplate$(): Observable<TemplateRef<any> | null> {
      return this.sidebarTemplate$.asObservable();
    }
  }
  ```
- Trong `InventoryKeeperLayoutComponent`, vùng Sidebar sử dụng:
  ```html
  <ng-container *ngTemplateOutlet="currentSidebarTemplate$ | async"></ng-container>
  ```
- Từng component con (`InventoryKeeperBatchesComponent`...) định nghĩa `<ng-template #sidebarContent>` và đăng ký vào service trong `ngAfterViewInit`, tự động gỡ bỏ trong `ngOnDestroy`.

---

## 3. Cơ chế Quét Barcode / QR Kép: Máy quét Phần cứng HID & Camera HTML5

### Vấn đề Kỹ thuật
Tại kho hàng nhà hàng:
1. Khi thủ kho đứng tại quầy kiểm kê (bàn giao hàng), họ thường sử dụng máy quét mã vạch chuyên dụng cầm tay (súng quét USB hoặc Bluetooth). Máy quét này hoạt động như một bàn phím phụ (Human Interface Device - HID Keyboard), gõ nhanh một chuỗi ký tự với tốc độ cực cao (< 30ms/ký tự) và kết thúc bằng phím `Enter`.
2. Khi thủ kho cầm máy tính bảng hoặc điện thoại đi kiểm kê từng kệ trong kho mát, họ không có máy quét USB mà cần dùng chính Camera của thiết bị để quét mã Barcode 1D hoặc QR Code 2D.

### Giải pháp Kiến trúc
Xây dựng `BarcodeScannerService` quản lý cả 2 chế độ:

1. **Bộ Lắng nghe Sự kiện Bàn phím Toàn cục (Global HID Scanner Listener)**:
   - Lắng nghe sự kiện `keydown` trên `window`.
   - Nếu khoảng cách thời gian giữa 2 phím liên tiếp < 50ms, ghi nhận là tín hiệu từ máy quét mã vạch phần cứng (không phải người dùng gõ tay thông thường).
   - Khi gặp phím `Enter`, nếu chuỗi ký tự tích lũy có độ dài >= 3 ký tự:
     + Chặn hành vi submit mặc định (`event.preventDefault()`).
     + Phát ra sự kiện `onBarcodeScanned(barcode)`.
     + Đưa chuỗi mã vạch vào bộ lọc và cuộn tới đúng lô hàng.
2. **Hộp thoại Quét Camera HTML5 (`BarcodeCameraModalComponent`)**:
   - Sử dụng Web API `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` kết hợp thư viện giải mã Barcode/QR tiêu chuẩn (`@zxing/library` hoặc Native `BarcodeDetector API` nếu trình duyệt hỗ trợ).
   - Hiển thị khung ngắm quét laser màu cam `#EA580C` hiện đại. Khi phát hiện mã vạch hợp lệ -> phát âm thanh beep nhẹ, đóng modal và đưa mã vào ô tìm kiếm.

---

## 4. Cơ chế Cập nhật Phản ứng Cảnh báo Kho (Reactive Alert Synchronizer Pattern)

### Vấn đề Kỹ thuật
Topbar hiển thị 3 thẻ KPI cảnh báo khẩn cấp:
- Lô cận date (<= 7 ngày).
- Nguyên liệu dưới định mức tồn an toàn.
- Lô quá hạn cần xuất hủy.
Cần đảm bảo các chỉ số này luôn chính xác mà không gây tải hệ thống do polling liên tục.

### Giải pháp Kiến trúc
Xây dựng `InventoryAlertStateService`:
- Quản lý trạng thái bằng Angular Signal: `alerts = signal<InventoryAlertDto[]>([]);`
- Hàm tải dữ liệu: `loadAlerts()` gọi `IInventoryAppService.GetAlertsAsync()`.
- **Cơ chế Phản ứng Nhanh (Reactive Trigger)**: Cung cấp `refreshAlerts()` được gọi ngay lập tức sau khi các modal thao tác kho (Tạo lô mới, Xuất hủy, Tạm khóa/Mở khóa, Kiểm kê) hoàn tất thành công.
- **Nút bấm thủ công trên Topbar**: Nút `[Làm mới]` có debounce 1000ms và animation xoay tròn `fa-spin`, phản hồi xúc giác mượt mà cho thủ kho.

---

## 5. Tương thích Thiết bị Cảm ứng & Drawer Offcanvas

### Vấn đề Kỹ thuật
Thủ kho thường xuyên thao tác trong môi trường kho lạnh với găng tay bảo hộ hoặc cầm máy tính bảng 1 tay.

### Giải pháp Kiến trúc
1. **Thiết kế Responsive Đa điểm chạm**:
   - Màn hình >= 992px: Sidebar hiển thị cố định 280px ở bên trái.
   - Màn hình < 992px: Sidebar chuyển thành Drawer trượt (Offcanvas) từ cạnh trái, che phủ 85% chiều rộng màn hình (tối đa 340px) với lớp nền làm mờ (backdrop blur).
2. **Kích thước Vùng chạm (Touch Target Size)**:
   - Tất cả các nút hành động (Nhập kho, Xuất hủy, Tạm khóa, Quét mã, Lọc) có chiều cao tối thiểu 44px, chiều rộng tối thiểu 44px.
   - Khoảng cách an toàn giữa các nút bấm tối thiểu 8px để triệt tiêu tình trạng bấm nhầm.
