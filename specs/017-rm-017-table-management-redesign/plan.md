# Kế hoạch Triển khai (Implementation Plan): RM-017 Làm lại trang Quản lý bàn (Table Management Redesign)

**Nhánh (Branch)**: `017-rm-017-table-management-redesign` | **Ngày**: 2026-10-16 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/017-rm-017-table-management-redesign/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 16-10-2026.

---

## Tóm tắt (Summary)

Tái thiết kế toàn diện giao diện và tối ưu trải nghiệm người dùng (UI/UX Redesign) cho phân hệ Quản lý Bàn ăn thuộc Wave 2 (`/tables` dành cho Quản lý/Admin và `/waiter/tables` dành cho Nhân viên phục vụ Waiter). Kế thừa nền tảng từ RM-008, RM-009, RM-010, RM-015 và RM-016.

Các mục tiêu kiến trúc cốt lõi:
1. **Chuẩn hóa Ngôn ngữ Thiết kế Cam & Trắng (`#EA580C`)**:
   - Hiện đại, bo góc mềm mại (`rounded-2xl`), độ tương phản cao, thẻ đổ bóng đa tầng tinh tế (`box-shadow`), loại bỏ hoàn toàn các khung viền thô kệch cũ.
   - Thao tác cảm ứng thân thiện với ngón tay (Touch target $\ge 44 \times 44\text{px}$) trên POS và Tablet.
2. **Cải tiến Thẻ Bàn Thông minh & Hệ thống Cảnh báo Thời gian Dùng bữa 2 Tầng**:
   - Đồng bộ thời gian dùng bữa theo thời gian thực (Elapsed Seated Time) từ mốc `OccupiedTime` với reactive Signal timer 30s.
   - 2 mức cảnh báo: Mức 1 ($\ge$ 60 phút, vàng `badge-meal-warning` nhắc nhở chăm sóc/tiếp nước) và Mức 2 ($\ge$ 90 phút, đỏ cam `badge-meal-long` nhấp nháy cảnh báo bàn ngồi lâu/giờ cao điểm).
3. **Nghiệp vụ Chuyển bàn (`Transfer Table`) & Gộp bàn (`Merge Tables`) An toàn**:
   - Chuyển giao toàn bộ đơn hàng và `OccupiedTime` sang bàn đích, phân nhánh thông minh trạng thái bàn nguồn (`CLEANING` nếu đã có order/dùng món; `AVAILABLE` nếu khách vừa ngồi chưa dùng món).
   - Gộp toàn bộ món ăn từ bàn phụ sang bàn chính, đóng đơn hàng phụ và xuất 1 hóa đơn duy nhất tại RM-016.
   - Cả Waiter và Manager đều được thực hiện Chuyển bàn và Gộp bàn trực tiếp trên Thẻ bàn.
4. **Hộp thoại Kết thúc Bữa ăn (`EndMealModal`) kèm Timeline Tiến trình 3 Mốc**:
   - Hiển thị Timeline: `Giờ nhận bàn (Seated At) → Thời lượng (Elapsed) → Giờ kết thúc (Ended At)`.
   - Phân nhánh: Bàn không có order $\rightarrow$ xác nhận trả bàn trống về `AVAILABLE`; Bàn có order $\rightarrow$ nút `[Chuyển sang Thanh toán →]` điều hướng sang RM-016.
5. **Tái cấu trúc Mã nguồn & Bóc tách Sub-component Dùng chung**:
   - Bóc tách file nguyên khối khổng lồ `table.component.html` (2263 dòng) và `table.component.ts` (1914 dòng) thành các modal dùng chung độc lập (`TableTransferModalComponent`, `TableMergeModalComponent`, `TableEndMealModalComponent`, `TableFormModalComponent`, `DiningAreaModalComponent`).
   - Màn hình `/tables` chuyển đổi 1 chạm mượt mà giữa `Floor Plan Grid` và `Datatable List View`.
6. **Quốc tế hóa & Song ngữ (i18n)**: Hỗ trợ 100% Tiếng Việt và Tiếng Anh trong cả 2 tệp `vi.json` và `en.json`.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: C# 12, .NET 9, ABP Framework 9.x, TypeScript 5.x, Angular 19+
- **Kiến trúc Backend**: Domain-Driven Design (DDD), EF Core 9, Application Services, Repository Pattern, SignalR Realtime Notifier (`TableRealtimeNotifier`)
- **Kiến trúc Frontend**: Angular Standalone Components, Signal Reactive State (`signal`, `computed`), ABP Core & Theme Shared Module, Ngx-Datatable, FontAwesome Free icons
- **Ràng buộc Hiệu năng**:
  - Chuyển đổi giữa chế độ `Floor Plan` và `List View` < 100ms
  - Độ trễ phát sóng SignalR cập nhật trạng thái bàn < 1s
  - Kích thước vùng chạm cảm ứng tối thiểu 44 × 44px
- **Ràng buộc Thương hiệu & I18N**:
  - Tuân thủ bảng màu nhận diện Cam & Trắng (`#EA580C`, `#FFFFFF`, `#F8FAFC`, `#64748B`)
  - 100% chuỗi văn bản giao diện lưu đầy đủ trong `vi.json` và `en.json`

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp**:
  - Định nghĩa rõ DTOs `TransferTableInputDto`, `MergeTablesInputDto` trong `Application.Contracts`, và logic giao dịch nguyên tử trong `TableAppService` (Application layer).
- [x] **II. UML & Domain Model Alignment**:
  - Khớp với mô hình thực thể `RestaurantTable` và `DiningArea` trong `RMS-TH.vpp` và luồng nghiệp vụ khép kín tại `docs/roadmap.md`.
- [x] **III. Test-First & Automated Quality Gates**:
  - Cung cấp kịch bản kiểm thử độc lập cho Chuyển bàn, Gộp bàn, Đếm giờ 2 tầng cảnh báo, và Kết thúc bữa ăn.
- [x] **IV. Hợp đồng API & Tích hợp Module**:
  - Hợp đồng REST API rõ ràng cho `transfer-table` và `merge-tables`, tương thích ngược với các module RM-008, RM-009, RM-010, RM-015, RM-016.
- [x] **V. Bảo mật & Phân quyền**:
  - Áp dụng các policy quyền `TooHungryPermissions.Tables.UpdateStatus`, `TooHungryPermissions.Tables.Manage` an toàn.
- [x] **VI. Nhận diện Giao diện Cam & Trắng**:
  - Thẻ bàn hiện đại, bo góc mềm, độ tương phản sắc nét, hiệu ứng pulse cho bàn ngồi lâu.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% nhãn, tiêu đề, tooltip, thông báo có bản dịch song ngữ trong `en.json` và `vi.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ tài liệu đặc tả, kế hoạch, nghiên cứu, hợp đồng được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Thiết kế (specs/)
```text
specs/017-rm-017-table-management-redesign/
├── spec.md                            # Đặc tả nghiệp vụ và biên bản làm rõ (/speckit.clarify)
├── plan.md                            # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                        # Nghiên cứu kỹ thuật Sub-components, Timer 2 tầng, Atomic API
├── data-model.md                      # Thiết kế DTOs, Signal States và từ điển i18n song ngữ
├── quickstart.md                      # Hướng dẫn kiểm thử 5 kịch bản vận hành
├── contracts/
│   └── table-management-contracts.md  # Hợp đồng REST API, Angular Proxy, SignalR Events
└── checklists/
    └── requirements.md                # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Cập nhật & Triển khai
```text
# Backend .NET
Acme.TooHungry/src/
├── Acme.TooHungry.Application.Contracts/
│   └── Tables/
│       ├── TableDtos.cs               # Bổ sung TransferTableInputDto, MergeTablesInputDto
│       └── ITableAppService.cs        # Bổ sung TransferTableAsync, MergeTablesAsync
├── Acme.TooHungry.Application/
│   └── Tables/
│       └── TableAppService.cs         # Triển khai TransferTableAsync và MergeTablesAsync nguyên tử
└── Acme.TooHungry.HttpApi/
    └── Controllers/
        └── TableController.cs         # Expose endpoint /api/app/table/transfer, /merge (nếu cần)

# Frontend Angular
Acme.TooHungry/angular/src/
├── app/
│   ├── proxy/tables/
│   │   ├── models.ts                  # Cập nhật interface TransferTableInputDto, MergeTablesInputDto
│   │   └── table.service.ts           # Bổ sung hàm transferTable, mergeTables
│   ├── shared/components/tables/      # BÓC TÁCH CÁC SUB-COMPONENT DÙNG CHUNG
│   │   ├── table-transfer-modal/      # Modal Chuyển bàn (Waiter + Admin)
│   │   ├── table-merge-modal/         # Modal Gộp bàn (Waiter + Admin)
│   │   └── table-end-meal-modal/      # Modal Kết thúc bữa ăn kèm Timeline (Waiter + Admin)
│   ├── waiter/tables/                 # REFACTOR GIAO DIỆN PHỤC VỤ (WAITER)
│   │   ├── waiter-tables.component.ts # Sử dụng shared modals, timer 2 tầng cảnh báo
│   │   ├── waiter-tables.component.html # Template sạch sẽ, responsive, touch-friendly
│   │   └── waiter-tables.component.scss # Nhận diện Cam & Trắng, badge-meal-warning & long
│   └── table/                         # REFACTOR TOÀN DIỆN MÀN HÌNH QUẢN TRỊ (ADMIN)
│       ├── table-form-modal/          # Modal Thêm/Sửa Bàn
│       ├── dining-area-form-modal/    # Modal Thêm/Sửa Khu vực
│       ├── table.component.ts         # Tái cấu trúc (giảm từ 1914 dòng xuống < 600 dòng)
│       ├── table.component.html       # Tái cấu trúc (giảm từ 2263 dòng xuống < 500 dòng)
│       └── table.component.scss       # Floor Plan Grid & Datatable List View chuẩn Cam & Trắng
└── assets/i18n/
    ├── vi.json                        # Bổ sung bản dịch Tiếng Việt
    └── en.json                        # Bổ sung bản dịch Tiếng Anh
```

---

## Lộ trình Triển khai (Implementation Phases)

### Giai đoạn 1: Backend Contracts & Atomic App Services (P1)
- Bổ sung `TransferTableInputDto` và `MergeTablesInputDto` trong `TableDtos.cs`.
- Mở rộng giao diện `ITableAppService.cs`.
- Triển khai logic giao dịch nguyên tử trong `TableAppService.cs`:
  + `TransferTableAsync`: Chuyển Order, chuyển `OccupiedTime`, cập nhật Bàn đích sang `OCCUPIED`, phân nhánh Bàn nguồn (`CLEANING` nếu có order/dùng món; `AVAILABLE` nếu chưa dùng món), broadcast SignalR.
  + `MergeTablesAsync`: Ghép `OrderItem` từ bàn phụ sang bàn chính, tính lại tổng tiền, đóng order phụ, giải phóng bàn phụ về `CLEANING`, broadcast SignalR.
- Cập nhật Proxy Angular (`models.ts`, `table.service.ts`).

### Giai đoạn 2: Xây dựng Bộ Modal Dùng Chung Độc lập (Shared Modals) (P1)
- Xây dựng `TableTransferModalComponent`: Tìm kiếm và lọc bàn trống đích, hiển thị sức chứa, cảnh báo chênh lệch, gọi API chuyển bàn.
- Xây dựng `TableMergeModalComponent`: Chọn bàn phụ để gộp, xác nhận gộp món và hóa đơn duy nhất.
- Chuẩn hóa `TableEndMealModalComponent`: Card Timeline 3 mốc (`Seated At → Elapsed → Ended At`), phân nhánh có/không có order, điều hướng RM-016.

### Giai đoạn 3: Nâng cấp Phân hệ Vận hành Waiter (`/waiter/tables`) (P1)
- Tích hợp 2 cấp độ cảnh báo thời lượng dùng bữa (Mức 1 $\ge$ 60p `badge-meal-warning`, Mức 2 $\ge$ 90p `badge-meal-long`).
- Tích hợp các modal dùng chung (`TableTransferModalComponent`, `TableMergeModalComponent`, `TableEndMealModalComponent`).
- Tối ưu các nút thao tác nhanh trên thẻ bàn cho thao tác chạm POS/Tablet (touch target $\ge 44 \times 44\text{px}$).

### Giai đoạn 4: Tái cấu trúc & Nâng cấp Màn hình Quản trị Admin (`/tables`) (P1)
- Bóc tách `TableFormModalComponent` (Thêm/Sửa bàn) và `DiningAreaFormModalComponent` (Thêm/Sửa khu vực).
- Tinh gọn `table.component.html` và `table.component.ts`: Loại bỏ Order Modal nhân bản và các khối modal trùng lặp, giữ lại điều khiển Sơ đồ bàn (Grid) và Bảng danh sách (Datatable List View).
- Đồng bộ nhận diện Cam & Trắng, 6 thẻ chỉ số mặt bằng, lọc khu vực.

### Giai đoạn 5: Quốc tế hóa (i18n), Kiểm thử Tích hợp & Hoàn thiện (P1)
- Rà soát và cập nhật 100% key đa ngôn ngữ trong `vi.json` và `en.json`.
- Kiểm thử đầy đủ 5 kịch bản theo [quickstart.md](quickstart.md).
- Kiểm tra tính nhất quán và hoàn tất tài liệu.
