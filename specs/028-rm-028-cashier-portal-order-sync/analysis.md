# Báo cáo Phân tích Tính năng (Feature Analysis Report): RM-028 Phân hệ Thu ngân & Đồng bộ Thời gian thực

**Mã Tính năng**: `RM-028`  
**Nhánh (Branch)**: `028-rm-028-cashier-portal-order-sync`  
**Ngày lập**: 2026-10-26  
**Chuyên gia phân tích**: **ADAM** (Antigravity AI Assistant)  
**Tài liệu đối soát**:
- Đặc tả: [spec.md](spec.md)
- Kế hoạch kỹ thuật: [plan.md](plan.md)
- Danh mục công việc: [tasks.md](tasks.md)
- Mô hình dữ liệu: [data-model.md](data-model.md)
- Hợp đồng giao tiếp: [contracts/api-contracts.md](contracts/api-contracts.md) & [contracts/signalr-contract.md](contracts/signalr-contract.md)
- Kịch bản xác thực: [quickstart.md](quickstart.md)

---

## 1. Mục tiêu & Phạm vi Phân tích (Objectives & Scope)

Bản phân tích này thực hiện đánh giá toàn diện mức độ hoàn thiện về mặt kiến trúc, đối soát yêu cầu nghiệp vụ với hiện trạng mã nguồn, phân tích khoảng cách kỹ thuật (Gap Analysis), nhận diện các rủi ro tiềm ẩn (concurrency, websocket lifecycle, browser audio autoplay, network resilience) và xác định độ sẵn sàng triển khai mã hóa (Implementation Readiness) cho tính năng **RM-028: Phân hệ Thu ngân & Đồng bộ Thời gian thực giữa Waiter và Cashier**.

---

## 2. Đối soát Ma trận Yêu cầu & Danh mục Công việc (Traceability Matrix)

Toàn bộ 6 User Stories nghiệp vụ chính và 8 quyết định kiến trúc đã làm rõ trong phiên `/speckit.clarify` đều được đối soát và ánh xạ 1-1 tới danh sách 29 công việc nguyên tử (Atomic Tasks) trong [tasks.md](tasks.md):

| Nhóm Yêu cầu / Quyết định Kiến trúc | Ánh xạ Spec | Nhiệm vụ Kỹ thuật | Trạng thái Đối soát |
| :--- | :--- | :--- | :---: |
| **Q1 & US5: Cấu trúc Tuyến đường & Phân quyền Phân hệ Thu ngân** | Spec §2 (A1, A5), US5 | `T001` (Backend Permissions), `T007` (Models), `T008` (Guard), `T009` (Routes), `T010` (Role Navigation), `T011` (Layout Shell) | ✅ **Khớp 100%** |
| **Q2 & US1: Sơ đồ Bàn ăn Thu ngân (Table Management)** | Spec §2 (A2), US1 | `T013` (Bento Grid), `T014` (Status Filters), `T015` (Cashier Table Card), `T016` (Quick Actions), `T017` (Pulsing Glow Border) | ✅ **Khớp 100%** |
| **Q3 & US2-US3: Quản lý Đơn hàng Toàn trình & Thanh toán Đa kênh** | Spec §2 (A3), US2, US3 | `T018` (Orders Kanban/Tabs), `T019` (Detail/Edit Modal), `T020` (Payment Modal), `T021` (FEFO Inventory Deduction & Order Completion) | ✅ **Khớp 100%** |
| **Q4 & US4: Đồng bộ Thời gian thực Hai chiều Waiter ↔ Cashier** | Spec §2 (A4), US4 | `T002` (Event DTOs), `T003` (Notifier extension), `T004` (AppService wiring), `T023` (CashierSyncService), `T024` (Waiter listener), `T025` (Cleaning sync) | ✅ **Khớp 100%** |
| **Q4: Chuông báo Âm thanh (Chime/Alert) & Nút Mute** | Spec §2 (A4) | `T022` (AudioNotificationService & Topbar Mute Toggle) | ✅ **Khớp 100%** |
| **Q7 & US6: Nút Reload Dự phòng tại chỗ (In-place Refresh mà không F5)** | Spec §2 (A7), US6 | `T017B` (Reload Tables for Waiter & Cashier), `T018B` (Reload Orders for Cashier & Waiter) | ✅ **Khớp 100%** |
| **Q8: Phản ứng Giao diện khi Khách yêu cầu Thanh toán (Pre-bill)** | Spec §2 (A8), US3 | `T017` (Thẻ bàn nhấp nháy viền cam đỏ + 2 nút thao tác nhanh `[In Pre-bill]` và `[Thanh toán]`) | ✅ **Khớp 100%** |
| **Phi chức năng: i18n & Tương thích Màn hình POS Cảm ứng** | Spec §4 (NFR-001..006) | `T026` (Song ngữ vi.json/en.json), `T027` (Touch target >= 44px), `T028` (Unit Tests), `T029` (Build & Regression) | ✅ **Khớp 100%** |

---

## 3. Phân tích Khoảng cách Mã nguồn (Codebase Gap Analysis)

### 3.1. Phía Backend (C# / .NET / ABP Framework)

| Thành phần | Hiện trạng trong Codebase (`src/`) | Khoảng cách cần xử lý trong RM-028 |
| :--- | :--- | :--- |
| **Hệ thống Phân quyền (Permissions)** | Có các nhóm quyền `Tables`, `Orders`, `Dishes`, `DiningAreas` trong `TooHungryPermissions.cs`. Chưa có nhóm quyền `Cashier`. | Cần thêm lớp hằng số `TooHungryPermissions.Cashier` với 4 quyền: `Default`, `ManageTables`, `ManageOrders`, `ProcessPayment` và đăng ký vào `TooHungryPermissionDefinitionProvider.cs`. |
| **SignalR TableHub** | Đã có `TableHub : AbpHub` được bảo vệ bằng `[Authorize]` tại đường dẫn `/signalr-hubs/table`. | Giữ nguyên hub hiện tại, không cần tạo hub mới để tránh phân mảnh websocket connection. |
| **SignalR Notifier (`ITableRealtimeNotifier`)** | Đã có 2 phương thức: `NotifyTableStatusChangedAsync` và `NotifyTableOrderUpdatedAsync`. | Cần bổ sung 3 phương thức mới: `NotifyOrderPlacedOrUpdatedAsync`, `NotifyBillRequestedAsync`, `NotifyPaymentCompletedAsync` cùng các DTO sự kiện tương ứng trong `Acme.TooHungry.Application.Contracts`. Triển khai trong `TableRealtimeNotifier.cs` và `NullTableRealtimeNotifier.cs`. |
| **Order AppService (`OrderAppService.cs`)** | Đã tích hợp trừ kho FEFO, đổi trạng thái bàn sang `Cleaning` và bắn SignalR trong `CurrentUnitOfWork.OnCompleted`. | Cần thêm logic phát sự kiện SignalR: `OrderPlacedOrUpdated` khi có món mới, `BillRequested` khi Waiter yêu cầu tính tiền, và `PaymentCompleted` khi hoàn tất thanh toán. |
| **Cashier AppService** | Chưa có service chuyên biệt cho quầy Thu ngân. | Cần bổ sung `CashierAppService` cung cấp endpoint tổng quan ca trực `GetShiftSummaryAsync` (`/api/app/cashier/shift-summary`) để hiển thị thống kê ca trên Topbar. |

### 3.2. Phía Frontend (Angular 19 / Standalone / RxJS)

| Thành phần | Hiện trạng trong Codebase (`angular/`) | Khoảng cách cần xử lý trong RM-028 |
| :--- | :--- | :--- |
| **Phân hệ `/cashier`** | Chưa có thư mục `src/app/cashier/`. Router chưa đăng ký route `/cashier`. | Cần tạo mới module standalone `/cashier` với các component: `CashierLayoutComponent`, `CashierTablesComponent`, `CashierOrdersComponent`. Đăng ký routing trong `app.routes.ts`. |
| **Bảo vệ Tuyến đường (`cashierAuthGuard`)** | Có `waiterAuthGuard` và `dashboard.guard`. Chưa có guard cho Cashier. | Xây dựng `cashierAuthGuard` kiểm tra quyền `TooHungry.Cashier` hoặc role `Cashier`/`Manager`/`Administrator`. |
| **Điều hướng Vai trò (`UserRoleNavigationService`)** | Hiện tại đang định tuyến role `Cashier` về `/tables` hoặc `/waiter/tables` (dòng 143). | Cập nhật `UserRoleNavigationService`: vai trò `Cashier` sẽ được điều hướng mặc định về `/cashier/tables` với label `Cashier:Portal`. |
| **Dịch vụ SignalR Client (`TableSignalrService`)** | Đã kết nối tự động tới `/signalr-hubs/table`, quản lý token OAuth và tự động kết nối lại (`withAutomaticReconnect`). Mới chỉ lắng nghe 2 event: `TableStatusChanged` và `TableOrderUpdated`. | Bổ sung 3 Subject/Observable mới cho `orderPlacedOrUpdated$`, `billRequested$`, `paymentCompleted$`. |
| **Đồng bộ State Thu ngân (`CashierSyncService`)** | Chưa có. | Xây dựng `CashierSyncService` làm cầu nối giữa `TableSignalrService` và state của Cashier, quản lý badge đơn chờ và cập nhật dữ liệu phản ứng (reactive). |
| **Âm thanh Chuông báo (`AudioNotificationService`)** | Chưa có. | Xây dựng dịch vụ phát Web Audio API synthesizer (Chime nhẹ khi có đơn mới, chuông cảnh báo 2 hồi khi yêu cầu thanh toán), hỗ trợ nút Mute lưu cấu hình trong `localStorage`. |
| **Nút Tải lại tại chỗ (In-place Reload)** | Phía Waiter mới chỉ có nút refresh trong sidebar filter; chưa có nút Tải lại trực diện trên thanh công cụ bàn/đơn cho cả Waiter và Cashier. | Trang bị nút `[fa-rotate] Tải lại` trên thanh công cụ/bộ lọc phía trên danh sách bàn và đơn hàng ở cả hai phân hệ Waiter và Cashier, gọi API tải lại dữ liệu mà không F5 trang web. |

---

## 4. Phân tích Rủi ro Kỹ thuật & Chiến lược Kiểm soát (Technical Risks & Mitigations)

### Rủi ro 1: Race Condition & Xung đột Dữ liệu khi Waiter và Cashier thao tác đồng thời
- **Kịch bản rủi ro**: Waiter gọi thêm món trong khi Cashier đang bấm thanh toán; hoặc 2 nhân viên thu ngân cùng mở modal thanh toán cho một bàn và bấm xác nhận cùng lúc.
- **Mức độ rủi ro**: Cao (High).
- **Chiến lược kiểm soát**:
  1. *Khóa trạng thái đơn hàng*: `OrderAppService.cs` đã có điều kiện kiểm tra nghiêm ngặt: nếu đơn hàng đã ở trạng thái `Completed`, mọi yêu cầu chỉnh sửa hoặc thanh toán tiếp theo đều bị chặn với ngoại lệ `TooHungry:Order:AlreadyCompleted`.
  2. *Kiểm soát Concurrency qua ConcurrencyStamp*: Thực thể `Order` và `RestaurantTable` kế thừa ABP AggregateRoot có cơ chế kiểm tra `ConcurrencyStamp`, ngăn chặn việc ghi đè dữ liệu cũ.
  3. *Idempotency Token*: Tận dụng Idempotency Key kế thừa từ RM-022 và RM-026 trên API thanh toán để đảm bảo nếu người dùng click đúp, giao dịch trừ kho và đóng đơn chỉ thực hiện đúng một lần.

### Rủi ro 2: Mất kết nối Mạng / Mất kết nối WebSocket SignalR
- **Kịch bản rủi ro**: Wi-Fi nội bộ nhà hàng chập chờn, hoặc máy tính bảng/POS vào chế độ ngủ (sleep) rồi bật lại, dẫn đến bỏ lỡ các sự kiện SignalR.
- **Mức độ rủi ro**: Trung bình (Medium).
- **Chiến lược kiểm soát**:
  1. *Tự động kết nối lại (Automatic Reconnect)*: `TableSignalrService` đã cấu hình cơ chế tự động thử lại `[0, 2000, 5000, 10000] ms`. Khi kết nối lại thành công, hệ thống tự động kích hoạt tải lại dữ liệu snapshot.
  2. *Nút Reload Dự phòng tại chỗ (In-place Reload)*: Giải pháp từ yêu cầu của người dùng (Q7): Trang bị nút `[fa-rotate] Tải lại` trên thanh công cụ bàn và đơn hàng. Khi bấm, chỉ gọi API lấy lại dữ liệu mới nhất mà **tuyệt đối không F5 trình duyệt**, bảo toàn bộ lọc và trạng thái đang làm việc.

### Rủi ro 3: Chính sách Chặn Tự động Phát Âm thanh của Trình duyệt (Browser Autoplay Policy)
- **Kịch bản rủi ro**: Trình duyệt Chrome/Edge chặn việc phát âm thanh chuông báo nếu người dùng chưa tương tác lần đầu tiên trên trang (`NotAllowedError: play() failed because the user didn't interact with the document first`).
- **Mức độ rủi ro**: Trung bình (Medium).
- **Chiến lược kiểm soát**:
  1. `AudioNotificationService` sử dụng Web Audio API (`AudioContext`). Khởi tạo `AudioContext` ở trạng thái chờ và tự động `resume()` ngay khi người dùng click bất kỳ đâu trên ứng dụng lần đầu tiên (hoặc click nút Mute/Unmute trên Topbar).
  2. Dùng Web Audio API âm thanh tổng hợp (oscillator sine wave) tạo âm chuông Chime trong trẻo, không phụ thuộc vào việc tải tệp `.mp3` ngoại vi, tránh lỗi 404 hoặc tải chậm tệp âm thanh.

### Rủi ro 4: Bố cục & Thao tác trên Màn hình POS Cảm ứng (Touch Ergonomics)
- **Kịch bản rủi ro**: Các nút bấm nhỏ khó chạm chính xác trên màn hình cảm ứng POS Terminal, gây nhầm lẫn giữa in Pre-bill và Thanh toán.
- **Mức độ rủi ro**: Thấp (Low).
- **Chiến lược kiểm soát**:
  1. Mọi nút bấm và thẻ bàn đều tuân thủ kích thước tối thiểu >= 44×44px theo chuẩn WCAG/W3C Touch Target.
  2. Phân biệt màu sắc trực quan: Nút `[In Pre-bill]` dùng tông màu xám bạc viền nổi, nút `[Thanh toán]` dùng tông màu cam thương hiệu (`#EA580C`) nổi bật.
  3. Tránh hoàn toàn các thao tác phụ thuộc vào `hover` (chỉ hiển thị khi di chuột).

---

## 5. Điểm Đánh giá Độ sẵn sàng (Implementation Readiness Score)

| Tiêu chí Đánh giá | Trọng số | Điểm số | Ghi chú đánh giá |
| :--- | :---: | :---: | :--- |
| **Độ rõ ràng của Đặc tả Nghiệp vụ (Spec Completeness)** | 25% | **25/25** | Đã làm rõ toàn bộ 8 câu hỏi then chốt qua `/speckit.clarify`. 6 kịch bản Gherkin chi tiết. |
| **Tính khả thi & Đồng nhất Kiến trúc (Architectural Consistency)** | 25% | **25/25** | Kế thừa hoàn hảo từ hạ tầng ABP, `TableHub`, `OrderAppService`, Bento Grid và RBAC. |
| **Tính Đầy đủ của Hợp đồng (Contracts & Data Models)** | 20% | **20/20** | Đã có đầy đủ contracts REST API và SignalR events kèm payload TypeScript/C#. |
| **Độ phân rã & Tính Khả thi của Kế hoạch (Task Breakdown)** | 15% | **15/15** | Phân rã thành 29 tasks độc lập, có thứ tự thực hiện rõ ràng theo 6 phases. |
| **Môi trường & Độ sẵn sàng Kiểm thử (Testability & Environment)** | 15% | **13/15** | Cả hai tiến trình backend (`dotnet run`) và frontend (`npm start`) đang chạy ổn định. Hệ thống có 86 unit tests Vitest sẵn sàng. Cần bổ sung test suites cho Cashier. |
| **TỔNG ĐIỂM ĐỘ SẴN SÀNG (READINESS SCORE)** | **100%** | **98%** | **SẴN SÀNG BẮT ĐẦU TRIỂN KHAI (READY FOR IMPLEMENTATION)** |

---

## 6. Đề xuất Bước tiếp theo (Next Action)

Bản đặc tả và kiến trúc của **RM-028** đã đạt độ chín muồi cao nhất (98%). Không còn bất kỳ điểm nghẽn hay câu hỏi mơ hồ nào.

👉 **Đề xuất hành động**: Bắt đầu giai đoạn triển khai mã nguồn thông qua lệnh:
```text
/speckit.implement RM-028
```
Quy trình sẽ lần lượt thực hiện theo 6 pha:
1. **Phase 1**: Backend Permissions, SignalR Notifier expansion (`ITableRealtimeNotifier`), and `CashierAppService`.
2. **Phase 2**: Angular Routes, `cashierAuthGuard`, `UserRoleNavigationService`, and `CashierLayoutComponent`.
3. **Phase 3**: `CashierTablesComponent` với Bento Grid, thẻ bàn chuyên biệt, và nút Reload tại chỗ.
4. **Phase 4**: `CashierOrdersComponent` với 4 tab Kanban, modal chi tiết và modal thanh toán đa kênh.
5. **Phase 5**: Kết nối SignalR hai chiều, chuông báo âm thanh (`AudioNotificationService`), và đồng bộ Waiter ↔ Cashier.
6. **Phase 6**: Bản địa hóa song ngữ (i18n `vi.json`/`en.json`), tối ưu màn hình cảm ứng POS, unit tests Vitest và kiểm thử hồi quy.
