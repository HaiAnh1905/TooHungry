# Kế hoạch Triển khai (Implementation Plan): RM-016 Thanh toán đơn hàng (Payment Page)

**Nhánh (Branch)**: `016-rm-016-payment-page` | **Ngày**: 2026-10-12 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/016-rm-016-payment-page/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 12-10-2026.

---

## Tóm tắt (Summary)

Xây dựng và hoàn thiện tính năng **Thanh toán đơn hàng (Payment Page) (RM-016)** thuộc phân hệ Vận hành (Operations, Wave 3). Màn hình này cung cấp giao diện thanh toán độc lập toàn màn hình (Standalone Layout) dành cho nhân viên phục vụ (`Waiter`) và thu ngân (`Cashier`) khi kết thúc bữa ăn tại bàn có Order, kết nối liền mạch giữa Gọi món (RM-010), Dọn bàn (RM-008) và Khấu trừ kho FEFO (RM-011).

Các mục tiêu kiến trúc cốt lõi:
1. **Bố cục Độc lập Toàn màn hình (Standalone Layout)**: Tuyến đường `/payment/:orderId` (và alias `/waiter/payment/:orderId`) sử dụng `eLayoutType.empty`, loại bỏ Topbar và Sidebar của Waiter, có nút `[← Quay lại danh sách bàn]` đưa về `/waiter/tables`.
2. **Bố cục 2 cột (Tỉ lệ 60% : 40%)**:
   - Cột trái (60%): Hóa đơn chi tiết (Order ID, Tên bàn, Ngày giờ, Danh sách món, Số lượng, Đơn giá, Thành tiền, Tổng tiền).
   - Cột phải (40%): Phương thức thanh toán gồm Tab `Tiền mặt` (hỗ trợ Quick Cash Presets và tự tính tiền thối) và Tab `Chuyển khoản QR` (VietQR Napas 247 kèm nút sao chép thông tin 1 chạm, xác nhận thủ công).
3. **API Chuyên biệt & Giao dịch Kép Nguyên tử (`CompletePaymentAsync`)**: Endpoint `POST /api/app/order/{id}/complete-payment` cập nhật đồng bộ: `Order → Completed`, `Table → Cleaning` (kèm realtime SignalR), và trừ kho nguyên liệu theo FEFO (RM-011) trong 1 transaction an toàn.
4. **Trải nghiệm sau Thanh toán (View Mode & Print K80)**: Giữ người dùng tại màn hình ở chế độ Đã thanh toán, khóa form thu tiền, làm nổi bật nút `[In hóa đơn]` (định dạng in nhiệt K80 chuẩn qua `@media print`) và nút `[← Quay lại danh sách bàn]`.
5. **Quốc tế hóa & Song ngữ (i18n)**: Hỗ trợ 100% Tiếng Việt và Tiếng Anh trong cả 2 tệp `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: C# 12, .NET 9, ABP Framework 9.x, TypeScript 5.x, Angular 19+
- **Kiến trúc Backend**: DDD (Domain-Driven Design), Aggregate Root, Application Services, Repository Pattern, SignalR Realtime Hub
- **Kiến trúc Frontend**: Angular Standalone Components, Signal State Management, Computed Signals, ABP Theme Shared Module, FontAwesome Free icons
- **Ràng buộc Hiệu năng**:
  - Tải dữ liệu hóa đơn và mã VietQR < 300ms
  - Thời gian xử lý API `CompletePaymentAsync` < 1s
  - Kích thước vùng chạm cảm ứng tối thiểu 44 × 44px
- **Ràng buộc Thương hiệu & I18N**:
  - Tuân thủ bảng màu nhận diện Cam & Trắng (`#EA580C`, `#FFFFFF`, `#F8FAFC`)
  - 100% chuỗi văn bản giao diện lưu đầy đủ trong `vi.json` và `en.json`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Định nghĩa rõ ràng enum `PaymentMethod` trong `Domain.Shared`, DTO `CompletePaymentInputDto` trong `Application.Contracts`, và logic nghiệp vụ thanh toán gói gọn trong `OrderAppService` (Application layer).
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với mô hình nghiệp vụ thanh toán nhà hàng trong `RMS-TH.vpp` và luồng vận hành khép kín tại `docs/roadmap.md` (`Order → Payment → Cleaning → Table Available`).
- [x] **III. Test-First & Automated Quality Gates**:
  - Hợp đồng API rõ ràng, cho phép kiểm thử đơn vị, kiểm thử tích hợp backend và kiểm thử E2E giao diện không lỗi.
- [x] **IV. Hợp đồng API & Tích hợp Module**:
  - Định nghĩa chặt chẽ hợp đồng REST API, Angular proxy `OrderService.completePayment`, và định dạng in `@media print`.
- [x] **V. Bảo mật & Phân quyền**:
  - Bảo vệ tuyến đường và API bằng chính sách quyền `TooHungry.Orders` / `TooHungry.Payments`, chỉ cho phép `Waiter`, `Cashier`, `Manager`, `Administrator` thực hiện thanh toán.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Thiết kế hiện đại, thẻ hóa đơn sạch sẽ, các nút điểm nhấn màu cam `#EA580C`, badge hoàn tất xanh ngọc chuyên nghiệp.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% chuỗi hiển thị có bản dịch song ngữ trong `en.json` và `vi.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ tài liệu đặc tả, nghiên cứu, kế hoạch và hợp đồng được biên soạn bằng Tiếng Việt.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (specs/)
```text
specs/016-rm-016-payment-page/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật API, VietQR, Quick Cash, Print K80
├── data-model.md                      # Thiết kế Enums, DTOs, Signal States và từ điển i18n
├── quickstart.md                      # Hướng dẫn kiểm thử 4 kịch bản vận hành
├── contracts/
│   └── order-payment-contracts.md     # Hợp đồng REST API, Proxy, SignalR và CSS @media print
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Cập nhật & Triển khai
```text
# Backend .NET
Acme.TooHungry/src/
├── Acme.TooHungry.Domain.Shared/
│   └── Orders/
│       └── PaymentMethod.cs           # Enum phương thức thanh toán (Cash = 1, VietQr = 2)
├── Acme.TooHungry.Application.Contracts/
│   └── Orders/
│       ├── CompletePaymentInputDto.cs # DTO truyền vào khi hoàn tất thanh toán
│       └── IOrderAppService.cs        # Bổ sung CompletePaymentAsync
├── Acme.TooHungry.Application/
│   └── Orders/
│       └── OrderAppService.cs         # Triển khai CompletePaymentAsync nguyên tử
└── Acme.TooHungry.HttpApi/
    └── Controllers/
        └── OrderController.cs         # Endpoint POST /api/app/order/{id}/complete-payment

# Frontend Angular
Acme.TooHungry/angular/src/
├── environments/
│   ├── environment.ts                 # Cấu hình vietQrConfig
│   └── environment.prod.ts            # Cấu hình vietQrConfig production
├── app/
│   ├── proxy/orders/
│   │   ├── models.ts                  # Cập nhật PaymentMethod, CompletePaymentInputDto
│   │   └── order.service.ts           # Bổ sung completePayment method
│   └── payment/
│       ├── payment.component.ts       # Cập nhật gọi CompletePaymentAsync, environment VietQR
│       ├── payment.component.html     # Cập nhật View Mode, Quick Cash, nút Quay lại bàn
│       └── payment.component.scss     # Tinh chỉnh bố cục 60/40, @media print K80 80mm
└── assets/i18n/
    ├── vi.json                        # Cập nhật từ điển tiếng Việt
    └── en.json                        # Cập nhật từ điển tiếng Anh
```

---

## Kế hoạch Triển khai theo Từng Giai đoạn (Phased Implementation Plan)

### Phase 1: Backend Domain.Shared & Application.Contracts
1. Tạo enum `PaymentMethod` (`Cash = 1`, `VietQr = 2`) trong `Acme.TooHungry.Domain.Shared/Orders/PaymentMethod.cs`.
2. Tạo DTO `CompletePaymentInputDto` trong `Acme.TooHungry.Application.Contracts/Orders/CompletePaymentInputDto.cs`.
3. Bổ sung phương thức `Task<OrderDto> CompletePaymentAsync(Guid id, CompletePaymentInputDto input)` vào `IOrderAppService.cs`.

### Phase 2: Backend Application Service & HTTP API Controller
1. Triển khai phương thức `CompletePaymentAsync` trong `OrderAppService.cs`:
   - Kiểm tra trạng thái đơn hàng (`Pending` / `Processing`).
   - Cập nhật `Status = OrderStatus.Completed`.
   - Khấu trừ kho nguyên liệu FEFO qua `ProcessOrderInventoryConsumptionAsync(order)`.
   - Cập nhật bàn ăn sang `TableStatus.Cleaning`, xóa dữ liệu đặt bàn cũ, phát SignalR qua `_realtimeNotifier.NotifyTableStatusChangedAsync`.
   - Trả về `OrderDto`.
2. Cập nhật `OrderController.cs` phơi bày endpoint `POST /api/app/order/{id}/complete-payment`.
3. Biên dịch kiểm tra Backend (`dotnet build`) đảm bảo không có lỗi cú pháp.

### Phase 3: Frontend Environment & Proxies
1. Cấu hình `vietQrConfig` trong `angular/src/environments/environment.ts` và `environment.prod.ts`.
2. Bổ sung `PaymentMethod` enum và `CompletePaymentInputDto` trong `proxy/orders/models.ts`.
3. Bổ sung phương thức `completePayment(id: string, input: CompletePaymentInputDto)` trong `proxy/orders/order.service.ts`.

### Phase 4: Frontend UI Enhancement & Hoàn thiện Màn hình Thanh toán
1. Cập nhật `PaymentComponent` (`payment.component.ts`):
   - Thay thế việc gọi `update` bằng `completePayment`.
   - Đọc cấu hình ngân hàng VietQR từ `environment.vietQrConfig`.
   - Quản lý trạng thái View Mode sau khi thanh toán thành công.
   - Sửa hàm `onBackToTables` điều hướng chuẩn xác về `/waiter/tables`.
2. Cập nhật giao diện `payment.component.html`:
   - Hoàn thiện thẻ hóa đơn 60% và thẻ phương thức thanh toán 40%.
   - Bổ sung chân hóa đơn in nhiệt K80 và hướng dẫn quét mã.
3. Cập nhật SCSS `payment.component.scss`:
   - Chuẩn hóa quy tắc in ấn `@media print` cho máy in nhiệt 80mm K80.
   - Đảm bảo touch target >= 44×44px cho mọi nút bấm.

### Phase 5: Quốc tế hóa & Đa ngôn ngữ (i18n)
1. Thêm toàn bộ các khóa ngôn ngữ thanh toán vào `angular/src/assets/i18n/vi.json`.
2. Thêm toàn bộ các khóa ngôn ngữ thanh toán vào `angular/src/assets/i18n/en.json`.
3. Kiểm tra tính toàn vẹn song ngữ trên toàn bộ giao diện.

### Phase 6: Kiểm thử & Xác thực Toàn diện
1. Chạy build kiểm tra Angular (`npm run build` hoặc dry run).
2. Kiểm tra chu trình end-to-end: Bàn `OCCUPIED` $\rightarrow$ Kết thúc bữa ăn $\rightarrow$ Thanh toán $\rightarrow$ Bàn `CLEANING` $\rightarrow$ Kho trừ FEFO.
3. Cập nhật trạng thái lộ trình trong `docs/roadmap.md`.

---

## Ma trận Truy vết Yêu cầu (Requirements Traceability Matrix)

| Mã Yêu cầu | Kịch bản US | Giai đoạn Thực hiện | Tệp Mã nguồn Tương ứng |
| :--- | :---: | :---: | :--- |
| **FR-001 - FR-003** | US1 | Phase 4 | `angular/src/app/app.routes.ts` |
| **FR-004 - FR-006** | US1 | Phase 4 | `payment.component.html`, `payment.component.scss` |
| **FR-007 - FR-008** | US2 | Phase 4 | `payment.component.ts`, `payment.component.html` |
| **FR-009 - FR-010** | US3 | Phase 3, 4 | `environment.ts`, `payment.component.ts` |
| **FR-011 - FR-012** | US4 | Phase 1, 2 | `OrderAppService.cs`, `OrderController.cs`, `IOrderAppService.cs` |
| **FR-013** | US4 | Phase 4 | `payment.component.ts`, `payment.component.html` |
| **FR-014 - FR-015** | US5 | Phase 4 | `payment.component.scss` (`@media print`) |
| **FR-016** | US6 | Phase 4 | `app.routes.ts`, `OrderController.cs` |
| **FR-017** | Toàn bộ | Phase 5 | `vi.json`, `en.json` |
| **FR-018** | Toàn bộ | Phase 4 | `payment.component.scss` (Responsive mobile/tablet) |
