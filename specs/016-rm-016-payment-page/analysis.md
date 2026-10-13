# Báo cáo Phân tích Kiểm chéo (Cross-Artifact Analysis): RM-016 Thanh toán đơn hàng

**Tính năng**: `RM-016 — Thanh toán đơn hàng (Payment Page)`  
**Ngày thực hiện**: 2026-10-12  
**Trạng thái**: Đạt Phê duyệt 100% (Passed - Ready for Implementation)  
**Tài liệu đối chiếu**:
- Đặc tả Nghiệp vụ: [spec.md](spec.md)
- Kế hoạch Triển khai: [plan.md](plan.md)
- Danh sách Công việc: [tasks.md](tasks.md)
- Hợp đồng Kiến trúc: [order-payment-contracts.md](contracts/order-payment-contracts.md)

---

## 1. Mục tiêu Phân tích

Tiến hành kiểm chéo toàn diện tính nhất quán, tính khả thi và độ bao phủ giữa:
1. **Yêu cầu Nghiệp vụ (`spec.md`)** với **Giải pháp Kỹ thuật (`plan.md`)**.
2. **Kế hoạch Triển khai (`plan.md`)** với **Danh sách Công việc Cụ thể (`tasks.md`)**.
3. **Hiện trạng Mã nguồn thực tế** với **Các thay đổi dự kiến thực thi**.

---

## 2. Ma trận Ánh xạ & Độ Phủ (Traceability Matrix)

### 2.1 Ánh xạ User Stories ↔ Yêu cầu Chức năng ↔ Tasks Triển khai

| User Story | Yêu cầu Chức năng (FR) | Tiêu chí Thành công (SC) | Tasks Triển khai (`tasks.md`) | Đánh giá Khớp nối |
|---|---|---|---|---|
| **US1**: Xem Hóa đơn Chi tiết 60% (P1) | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-018 | SC-001, SC-002, SC-008 | `T008`, `T009`, `T010` | **Khớp 100%**: Layout 2 cột 60/40 Standalone, danh sách món ăn, tính tổng tiền dự phòng, nút quay lại bàn `/waiter/tables`. |
| **US2**: Tiền mặt & Tính Tiền thối tự động (P1) | FR-007, FR-008 | SC-004 | `T011`, `T012` | **Khớp 100%**: Quick cash presets (`[Vừa đủ]`, `[50k]`..`[2tr]`), Angular Signal computed `changeAmount`, chặn thanh toán khi thiếu tiền. |
| **US3**: Quét mã VietQR Động (P1) | FR-009, FR-010 | SC-003 | `T004`, `T013`, `T014` | **Khớp 100%**: Đọc cấu hình `environment.vietQrConfig`, sinh mã Napas 247 với cú pháp `TOOHUNGRY <OrderNumber>`, sao chép 1 chạm có visual feedback. |
| **US4**: API `CompletePaymentAsync` & Giao dịch Kép (P1) | FR-011, FR-012, FR-013 | SC-005, SC-006 | `T001`, `T002`, `T003`, `T005`, `T006`, `T007`, `T015`, `T016` | **Khớp 100%**: Tạo enum `PaymentMethod`, DTO `CompletePaymentInputDto`, triển khai atomic transaction trong `OrderAppService`, SignalR broadcast, chuyển sang View Mode. |
| **US5**: In Hóa đơn Nhiệt K80 (P2) | FR-014, FR-015 | SC-006, SC-007 | `T017` | **Khớp 100%**: Chuẩn hóa CSS `@media print` 80mm K80, ẩn nút bấm và cột thu tiền, căn chỉnh sắc nét, thêm lời cảm ơn. |
| **US6**: Phân quyền & Bảo vệ Tuyến đường (P2) | FR-016 | SC-001 | `T006`, `T008` | **Khớp 100%**: Guard Angular (`smartPermissionGuard`) và thuộc tính `[Authorize]` trên `OrderController` cho các vai trò `Waiter`, `Cashier`, `Manager`, `Admin`. |
| **Quốc tế hóa & Kiểm thử Toàn diện** | FR-017, NFR-001..006 | SC-007, SC-008 | `T018`, `T019`, `T020`, `T021`, `T022` | **Khớp 100%**: Cập nhật song ngữ `vi.json` và `en.json` (cả backend lẫn frontend), xác thực build `dotnet build` và `ng build`, 4 kịch bản E2E. |

**Độ phủ Yêu cầu (Coverage Ratio)**: **18/18 FR (100%)**, **6/6 NFR (100%)**, **8/8 SC (100%)**, **22/22 Tasks (100%)**. Không có yêu cầu nào bị bỏ sót (Zero gaps) và không có công việc nào mồ côi (Zero orphaned tasks).

---

## 3. Kiểm tra Tính Nhất quán với 4 Quyết định Kiến trúc (`/speckit.clarify`)

1. **D1 (API Chuyên biệt `CompletePaymentAsync` & Giao dịch Nguyên tử)**:
   - `spec.md`: Mục Làm rõ Q1, FR-012, SC-005.
   - `plan.md`: Mục 1 Nghiên cứu kỹ thuật & Phase 1, Phase 2.
   - `contracts`: Mục 1.2 Hợp đồng REST API & Mục 2 Angular Service Proxy.
   - `tasks.md`: `T001` (Enum), `T002` (DTO), `T003` (Interface), `T005` (AppService logic), `T006` (Controller), `T007` (Proxy), `T015` (UI call).
   - *Đánh giá*: **Đồng nhất hoàn hảo 100%**.

2. **D2 (Tổng tiền đơn hàng giữ nguyên theo tổng món ăn, hoãn VAT/Giảm giá)**:
   - `spec.md`: Mục Làm rõ Q2, FR-006, US1 kịch bản chấp nhận 1.
   - `plan.md`: Mục Bối cảnh kỹ thuật & Giao diện Dữ liệu.
   - `tasks.md`: `T009` (tính toán `totalAmount = sum(quantity * unitPrice)`).
   - *Đánh giá*: **Đồng nhất hoàn hảo 100%**.

3. **D3 (Cấu hình VietQR tập trung tại `environment.ts` & Xác nhận thủ công)**:
   - `spec.md`: Mục Làm rõ Q3, FR-009, FR-010, SC-003.
   - `plan.md`: Mục 2 Nghiên cứu VietQR & Phase 3.
   - `data-model.md`: Interface `VietQrConfig`.
   - `tasks.md`: `T004` (cấu hình environment), `T013` (sinh URL theo environment), `T014` (UI tab QR).
   - *Đánh giá*: **Đồng nhất hoàn hảo 100%**.

4. **D4 (Trải nghiệm View Mode sau thanh toán & In hóa đơn K80)**:
   - `spec.md`: Mục Làm rõ Q4, FR-013, FR-014, FR-015, SC-006.
   - `plan.md`: Mục 4, 5 Nghiên cứu kỹ thuật & Phase 4, Phase 6.
   - `contracts`: Mục 4 Hợp đồng CSS `@media print`.
   - `tasks.md`: `T015` (Toast & View mode), `T016` (Khóa form, nút nổi bật), `T017` (CSS print K80).
   - *Đánh giá*: **Đồng nhất hoàn hảo 100%**.

---

## 4. Khảo sát Hiện trạng Mã nguồn & Đánh giá Tác động (Codebase Gap Analysis)

### 4.1 Backend (`Acme.TooHungry`)
1. **Enum & DTOs**:
   - *Hiện trạng*: Chưa có `PaymentMethod.cs` trong `Acme.TooHungry.Domain.Shared/Orders/` và chưa có `CompletePaymentInputDto.cs` trong `Acme.TooHungry.Application.Contracts/Orders/`.
   - *Giải pháp*: Tạo mới 2 tệp mã nguồn sạch sẽ, không ảnh hưởng đến các entity hiện có.
2. **`IOrderAppService.cs` & `OrderAppService.cs`**:
   - *Hiện trạng*: Đã có logic trừ kho FEFO `ProcessOrderInventoryConsumptionAsync` và cập nhật bàn trong `UpdateAsync`, nhưng `UpdateAsync` là phương thức CRUD chung không nhận DTO thanh toán; `CompleteActiveOrderByTableIdAsync` hiện đang gán bàn về `Available` thay vì `Cleaning`.
   - *Giải pháp*: Bổ sung phương thức chuyên biệt `CompletePaymentAsync(Guid id, CompletePaymentInputDto input)`. Đảm bảo luồng chuẩn mực: `Order → Completed`, `Table → Cleaning`, dọn dẹp `Reserved*`, phát SignalR `NotifyTableStatusChangedAsync` và khấu trừ kho FEFO.
3. **`OrderController.cs`**:
   - *Hiện trạng*: Đã phơi bày các endpoint CRUD và POS ordering, chưa có action complete-payment.
   - *Giải pháp*: Bổ sung action `[HttpPost("{id}/complete-payment")]`.

### 4.2 Frontend (`Acme.TooHungry/angular`)
1. **`environments/environment.ts` & `environment.prod.ts`**:
   - *Hiện trạng*: Đã có cấu hình `apis` và `application`, chưa có `vietQrConfig`.
   - *Giải pháp*: Bổ sung trường `vietQrConfig` với thông tin ngân hàng chuẩn của Acme.TooHungry.
2. **`proxy/orders/`**:
   - *Hiện trạng*: Chưa có định nghĩa `PaymentMethod`, `CompletePaymentInputDto` và method `completePayment`.
   - *Giải pháp*: Khai báo bổ sung trong `models.ts` và `order.service.ts`.
3. **`payment/payment.component.ts`**:
   - *Hiện trạng*: Đang gọi `orderService.update()` khi thanh toán; `onBackToTables()` đang điều hướng về `/tables` (đường dẫn admin cũ) thay vì `/waiter/tables`.
   - *Giải pháp*: Chuyển sang gọi `orderService.completePayment()`; đọc `vietQrConfig` từ `environment`; chuyển hướng `onBackToTables` chuẩn xác về `/waiter/tables`.
4. **`payment/payment.component.html` & `.scss`**:
   - *Hiện trạng*: Đã có bố cục chia cột và style khá hoàn chỉnh.
   - *Giải pháp*: Tinh chỉnh hiển thị View Mode, bổ sung footer in hóa đơn, chuẩn hóa `@media print` khổ 80mm K80.
5. **Localization (`vi.json` & `en.json`)**:
   - *Hiện trạng*: Đã có một số khóa từ đợt phát triển trước, nhưng thiếu một số nhãn chuyên biệt cho biên lai K80 và hướng dẫn QR.
   - *Giải pháp*: Đồng bộ đầy đủ 100% các khóa theo [data-model.md](data-model.md).

---

## 5. Đánh giá Rủi ro & Chiến lược Kiểm soát (Risks & Mitigations)

| Rủi ro Kỹ thuật | Mức độ | Khả năng | Biện pháp Kiểm soát & Xử lý |
|---|---|---|---|
| **Thanh toán đúp (Double Payment)** khi nhiều nhân viên cùng mở màn hình đơn hàng. | Cao | Thấp | Kiểm tra trạng thái đơn hàng ở backend trong `CompletePaymentAsync`; nếu `order.Status == Completed`, ném ngay `BusinessException`. Client nhận lỗi hiển thị thông báo và cập nhật giao diện sang View Mode. |
| **Vỡ bố cục in ấn khi in nhiệt K80** trên các trình duyệt khác nhau. | Trung bình | Thấp | Khai báo quy chuẩn `@page { size: 80mm auto; margin: 4mm; }`, cố định `max-width: 80mm`, sử dụng đơn vị `mm` và `pt` thay vì `px` trong `@media print`. |
| **Tính toán tiền thối bị lỗi số học JavaScript** với số tiền lớn. | Thấp | Thấp | Xử lý số nguyên VNĐ (làm tròn không dùng số thập phân), áp dụng `Math.max(0, given - total)`. |
| **SignalR không nhận diện bàn dọn dẹp tại `/waiter/tables`**. | Thấp | Rất thấp | Kế thừa kênh truyền và hub SignalR đã chạy ổn định từ RM-008 và RM-015 (`NotifyTableStatusChangedAsync`). |

---

## 6. Kết luận & Phê duyệt Thực thi

Hồ sơ kỹ thuật của **RM-016 (Thanh toán đơn hàng)** đạt độ hoàn thiện tối đa:
- **Tính Nhất quán (Consistency)**: 100% khớp nối giữa Spec, Plan, Contracts và Tasks.
- **Tính Khả thi (Feasibility)**: Mã nguồn backend và frontend có lộ trình can thiệp rõ ràng, không phá vỡ bất kỳ thành phần nào của các RM trước.
- **Độ sẵn sàng (Readiness)**: **PASS 100%**. Toàn bộ hệ thống sẵn sàng để bước sang giai đoạn thực thi mã nguồn (`/speckit.implement RM-016`).
