# Nghiên cứu & Quyết định Kiến trúc (Research & Technical Decisions): RM-009 Table Reservation Management

**Nhánh Tính năng**: `009-rm-009-table-reservation` | **Ngày**: 2026-10-09  
**Mục tiêu**: Giải quyết tất cả các khía cạnh kỹ thuật, cơ chế nền, quản lý trạng thái đồng thời và tích hợp hệ thống cho tính năng Đặt bàn trước của Acme.TooHungry.

---

## 1. Cơ chế Tự động Hủy Đơn Quá hạn (Background Worker Auto-Cancel)

- **Quyết định (Decision)**:
  - Triển khai một Background Worker kế thừa từ `AsyncPeriodicBackgroundWorkerBase` trong tầng `Acme.TooHungry.Application` (hoặc `Acme.TooHungry.Domain`) mang tên `ReservationAutoCancelBackgroundWorker`.
  - Thiết lập chu kỳ lặp `Timer.Period = 5 * 60 * 1000` (300,000 ms = 5 phút) theo quyết định đã chốt trong Clarification Session.
  - Sử dụng ABP `IUnitOfWorkManager` độc lập trong mỗi chu kỳ quét:
    - Truy vấn các đơn đặt bàn có `Status == ReservationStatus.Confirmed` và `ReservationTime <= DateTime.UtcNow.AddHours(-1)`.
    - Với mỗi đơn đặt bàn quá hạn:
      - Đổi trạng thái `Status = ReservationStatus.AutoCancelled`.
      - Tải thực thể `RestaurantTable` tương ứng: nếu bàn vẫn đang ở trạng thái `TableStatus.Reserved`, dọn sạch các trường thông tin đặt bàn (`ReservedCustomerName`, `ReservedCustomerPhone`, `ReservedTime`, `ReservedGuestCount`, `ReservedNote` set về `null`) và chuyển trạng thái về `TableStatus.Available`.
      - Phát sự kiện thông báo thời gian thực qua `IHubContext<TableHub>` tới client để giao diện cập nhật ngay lập tức.
- **Lý do (Rationale)**:
  - `AsyncPeriodicBackgroundWorkerBase` là giải pháp native chuẩn mực của ABP Framework, tự động khởi chạy cùng vòng đời ứng dụng máy chủ (`OnApplicationInitializationAsync`), không đòi hỏi hạ tầng phụ thuộc ngoài.
  - Tần suất 5 phút giúp tối ưu hóa hiệu năng máy chủ (không spam DB), đồng thời đảm bảo bàn được giải phóng đúng hạn.
  - Tạo chỉ mục kép `(Status, ReservationTime)` trên bảng cơ sở dữ liệu giúp câu truy vấn quét hoàn tất trong vài mili-giây.
- **Các phương án thay thế đã đánh giá (Alternatives considered)**:
  - *Lazy Evaluation*: Chỉ kiểm tra khi có người dùng truy cập trang `/waiter/tables` $\rightarrow$ Bị loại bỏ vì nếu không có nhân viên nào mở trình duyệt thì bàn sẽ bị giữ sai trạng thái trên server và các thiết bị khác.
  - *Hangfire / Quartz.NET phân tán*: Quá cồng kềnh và đòi hỏi cấu hình database schema riêng cho single-node background worker.

---

## 2. Mô hình Lưu trữ Đồng bộ: `RestaurantTable` vs `TableReservation`

- **Quyết định (Decision)**:
  - **`RestaurantTable` (Tối ưu Hiển thị Nhanh & Vận hành Waiter)**: Tiếp tục duy trì các trường denormalized gồm `ReservedCustomerName`, `ReservedCustomerPhone`, `ReservedTime`, `ReservedGuestCount`, `ReservedNote` và `Status = TableStatus.Reserved`. Điều này giúp endpoint lấy danh sách sơ đồ bàn `/waiter/tables` đạt tốc độ tối đa ($< 100\text{ms}$) mà không cần thực hiện phép JOIN phức tạp với bảng lịch sử.
  - **`TableReservation` (Quản lý Vòng đời & Lịch sử Đặt bàn Đầy đủ)**: Aggregate Root độc lập lưu giữ toàn bộ dữ liệu lịch sử đặt bàn của khách hàng, kể cả các đơn đã hoàn thành (`Completed`), đã hủy (`Cancelled`) hoặc tự động hủy (`AutoCancelled`).
  - **Cơ chế Đồng bộ (Atomic Synchronization)**: Mọi thao tác Đặt bàn, Đón khách, Hủy bàn hoặc Chỉnh sửa đều được thực thi trong cùng một Database Transaction thông qua Domain Service `TableReservationManager`.
- **Lý do (Rationale)**:
  - Đảm bảo tính nhất quán tuyệt đối (Atomicity) giữa trạng thái bàn ăn vật lý và bản ghi đơn đặt bàn nghiệp vụ.
  - Phù hợp với nguyên tắc Domain-Driven Design (DDD) của ABP Framework.
- **Các phương án thay thế đã đánh giá (Alternatives considered)**:
  - *Chỉ lưu trên TableReservation và bỏ trường trên RestaurantTable*: Buộc trang Waiter phải JOIN bảng mỗi khi tải dữ liệu, làm giảm hiệu năng và gây phức tạp cho cơ chế mapping DTO hiện có của RM-008.

---

## 3. Xác thực Khung giờ Mở cửa (09:00 - 22:59) & Giới hạn Đặt trước 7 Ngày

- **Quyết định (Decision)**:
  - **Backend Domain Rules**:
    - Xây dựng phương thức thẩm định tập trung trong Domain Service `TableReservationManager` và kiểm tra tại DTO Validation (`IValidatableObject`).
    - Quy tắc 1: `ReservationTime >= DateTime.UtcNow` (không được đặt trong quá khứ).
    - Quy tắc 2: `ReservationTime <= DateTime.UtcNow.Date.AddDays(7).AddHours(23).AddMinutes(59).AddSeconds(59)` (tối đa 7 ngày tới).
    - Quy tắc 3: Quy đổi thời gian nhận bàn về giờ địa phương nhà hàng (Local Time / TimeZone), kiểm tra:
      `TimeOfDay >= TimeSpan.FromHours(9) && TimeOfDay <= new TimeSpan(22, 59, 59)` (từ 09:00 đến 22:59).
    - Quy tắc 4: `1 <= GuestCount <= Table.Capacity` (không vượt quá sức chứa bàn).
  - **Frontend Client-Side Validation**:
    - Datepicker giới hạn `minDate = Today` và `maxDate = Today + 7 days`.
    - TimePicker hoặc bộ chọn giờ giới hạn từ `09:00` đến `22:59`.
    - Báo lỗi trực quan ngay khi nhân viên nhập liệu trước khi bấm gửi lên server.
- **Lý do (Rationale)**:
  - Đạt tiêu chí SC-002: 100% các vi phạm về khung giờ và sức chứa bị chặn ở cả hai tầng.

---

## 4. Xử lý Đa bàn trên một Số điện thoại & Cố định Bàn khi Sửa

- **Quyết định (Decision)**:
  - Cho phép một số điện thoại được đặt nhiều bàn khác nhau (không tạo Unique Index trên `CustomerPhone`).
  - Trong Modal chỉnh sửa (`UpdateReservationDto`):
    - Các trường cho phép cập nhật: `CustomerName`, `CustomerPhone`, `ReservationTime`, `GuestCount`, `Note`.
    - `TableId` là bất biến (Read-only); không hỗ trợ chọn đổi bàn trực tiếp trong modal sửa. Nếu muốn đổi bàn, nhân viên thực hiện hủy đơn trên bàn hiện tại và đặt trên bàn mới.
- **Lý do (Rationale)**:
  - Đơn giản hóa kiến trúc, tránh race condition chuyển đổi trạng thái giữa 2 bàn cùng lúc trên giao diện Waiter.
  - Tạo sự linh hoạt tối đa cho nhân viên khi phục vụ khách đoàn đặt nhiều bàn.

---

## 5. Tích hợp Ngoại vi & Real-time Synchronization (SignalR)

- **Quyết định (Decision)**:
  - **Tích hợp bên thứ ba**: Không tích hợp SMS/Email/Zalo gateway trong phiên bản này; toàn bộ quy trình khép kín nội bộ trên hệ thống.
  - **Real-time SignalR Hub**:
    - Tái sử dụng `TableHub` đã tạo tại RM-008.
    - Phát sự kiện `TableStatusChanged` kèm thông tin bàn cập nhật khi:
      1. Đặt bàn thành công (`AVAILABLE` $\rightarrow$ `RESERVED`).
      2. Đón khách thành công (`RESERVED` $\rightarrow$ `OCCUPIED`).
      3. Hủy đặt bàn thủ công (`RESERVED` $\rightarrow$ `AVAILABLE`).
      4. Auto-cancel quá hạn từ Background Worker (`RESERVED` $\rightarrow$ `AVAILABLE`).
- **Lý do (Rationale)**:
  - Đảm bảo độ trễ cập nhật trạng thái bàn giữa các thiết bị dưới 1 giây (SC-004).
