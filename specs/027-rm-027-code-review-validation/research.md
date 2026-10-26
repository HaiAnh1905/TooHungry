# Nghiên cứu Kỹ thuật (Technical Research): RM-027 Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit)

**Mã Tính năng**: `RM-027`  
**Ngày thực hiện**: 2026-10-26  
**Mục tiêu**: Nghiên cứu, chuẩn hóa phương pháp luận kiểm định độc lập và thiết lập bộ quy chuẩn đối soát cho toàn bộ 68 vấn đề kỹ thuật phát hiện từ [CODE_REVIEW.md](../../CODE_REVIEW.md).

---

## 1. Phương pháp luận & Quy trình Kiểm định Độc lập (Verification & Audit Methodology)

### Bối cảnh & Thách thức
Tài liệu `CODE_REVIEW.md` ghi nhận 68 vấn đề phân bổ qua 2 tầng công nghệ chính:
- **Backend (34 mục)**: 12 Nghiêm trọng 🔴, 19 Trung bình 🟡, 3 Nhỏ 🟢.
- **Frontend (34 mục)**: 9 Nghiêm trọng 🔴, 15 Trung bình 🟡, 10 Nhỏ 🟢.

Các vấn đề này đã được quy hoạch xử lý qua 5 gói giải pháp của Wave 5:
- `RM-022`: Data integrity, concurrency retry, race condition, pricing.
- `RM-023`: Security, permissions, hub protection, secrets sanitation.
- `RM-024`: Angular performance, memory leaks, component modularization, pager.
- `RM-025`: Database queries, N+1, indexing, domain modeling, clean code.
- `RM-026`: Automated testing (runtime auth, concurrency, idempotency).

**Thách thức đặt ra cho RM-027**: Làm thế nào để đối soát một cách khách quan, khoa học, có thể lặp lại và kiểm chứng bằng chứng cứ (verifiable evidence) chứ không chỉ dựa trên việc "đọc code bằng mắt"?

### Quyết định Kỹ thuật (Decision)
Áp dụng mô hình kiểm định kép **Dual-Gate Verification Framework (Static Inspection + Automated Dynamic Testing)**:
1. **Cổng 1 - Giám định Tĩnh (Static Code Inspection & AST/Regex Audit)**:
   - Kiểm tra trực tiếp vị trí mã nguồn tại các file và dòng tương ứng với `CODE_REVIEW.md`.
   - Xác định xem cấu trúc mã nguồn đã áp dụng đúng giải pháp khuyến nghị hay chưa (ví dụ: đã xóa các trường trạng thái khỏi DTO chưa, đã gắn `[Authorize]` cụ thể chưa, đã xóa các file rác ở thư mục gốc chưa).
2. **Cổng 2 - Xác minh Động qua Bộ Kiểm thử Tự động (Dynamic Automated Verification)**:
   - Đối với các lỗi logic (như trừ kho 2 lần, race condition tạo đơn, ném ngoại lệ phân quyền, concurrency retry FEFO), chỉ chấp nhận trạng thái `VERIFIED` khi có bài test tự động (xUnit) cụ thể thực thi đạt kết quả `PASS`.
   - Đối với Frontend, kiểm tra qua trình biên dịch TypeScript (`strict: true`), kiểm thử unit component và kiểm tra DOM bindings.

### Các phương án đã cân nhắc (Alternatives Considered)
- *Chỉ đọc mã nguồn bằng mắt (Manual Code Review)*: Dễ bỏ sót các trường hợp biên, không chứng minh được tính đúng đắn khi có tải hoặc tương tranh, không thể lặp lại khi có commit mới. -> **BỊ TỪ CHỐI**.
- *Chỉ chạy kiểm thử tự động (Pure Test Automation)*: Không bao quát được các mục về Clean Code, dọn dẹp file rác, cấu hình bí mật trong `appsettings.json`, hay tối ưu dung lượng SCSS. -> **BỊ TỪ CHỐI**.
- *Kết hợp Giám định Tĩnh + Kiểm thử Động (Dual-Gate)*: Toàn diện nhất, bao phủ 100% cả khía cạnh cấu trúc mã nguồn lẫn hành vi nghiệp vụ thời gian chạy. -> **ĐƯỢC CHỌN**.

---

## 2. Cơ chế Đối soát Tầng Backend (Backend Verification Harness)

### Phân tích 34 Vấn đề Backend
Toàn bộ 34 vấn đề Backend được chia thành 4 nhóm nghiệp vụ:

| Nhóm nghiệp vụ | Danh sách mục theo `CODE_REVIEW.md` | Gói sở hữu | Phương thức đối soát |
|----------------|-------------------------------------|------------|-----------------------|
| **Toàn vẹn Dữ liệu & Tương tranh** | #1 (Trừ kho 2 lần), #2 (Client đặt giá), #3 (DTO validation), #4 (Dự báo tồn kho), #5 (Retry UoW), #11 (SignalR sau commit), #12 (Race tạo đơn), #16 (Gộp bàn), #25 (Lô điều chỉnh) | RM-022, RM-025, RM-026 | Kiểm tra Domain Model `Order.Complete()`, `OrderAppService`, kết hợp chạy test cases trong `OrderAppService_Idempotency_Tests`, `EfCoreOrderRaceConditionTests`, `InventoryManager_Fefo_Concurrency_Tests`. |
| **Bảo mật & Phân quyền** | #6 (Cloudinary), #7 (DailyMenu), #8 (Recipe/TableOrder), #9 (Granular Permissions), #30 (Secrets & Swagger) | RM-023, RM-026 | Kiểm tra thuộc tính `[Authorize]` trên Controller/AppService, kiểm tra bộ lọc `SafeImageFileValidator`, cấu hình `appsettings.secrets.example.json`, chạy `EndpointAuthorization_Runtime_Tests`. |
| **Hiệu năng CSDL & Indexing** | #17 (Soft-delete filter), #18 (Recipe index), #20 (N+1 queries), #21 (Sync blocking), #22 (AutoInclude), #23 (Paging transactions), #24 (Mã số dễ trùng) | RM-025 | Kiểm tra `TooHungryDbContext.OnModelCreating`, migration indexes, chuyển `.ToList()` sang `ToListAsync()`, chạy integration tests EF Core. |
| **Kiến trúc Domain & Clean Code** | #10 (Mass assignment), #13 (Clock.Now), #14 (Giờ mở cửa), #15 (Booking 60m), #19 (Recipe version), #26 (Forecast state machine), #27 (BusinessException & i18n), #28 (Rich entities), #29 (BackgroundWorker UoW), #31 (Dashboard logging), #32 (Xóa file rác), #33 (Tách file/kế thừa), #34 (Bộ test) | RM-022, RM-025, RM-026 | Kiểm tra cấu trúc entities (`private set`), file localization (`vi.json`, `en.json`), xóa file rác thư mục gốc (`test.cs`, `Reflect.cs`), chạy toàn bộ test runner. |

### Tiêu chí Chấp thuận Backend (Acceptance Thresholds)
- **100% test suites xUnit PASS**: Tất cả 200+ tests trong `Acme.TooHungry.Application.Tests`, `Acme.TooHungry.EntityFrameworkCore.Tests` và `Acme.TooHungry.Domain.Tests` phải thực thi xanh (Green).
- **0 lỗi Nghiêm trọng (🔴) tồn đọng**: Cả 12 mục lỗi nghiêm trọng phải có mã nguồn chứng minh và test case tương ứng.
- **Biên dịch sạch**: `dotnet build` trả về 0 Errors.

---

## 3. Cơ chế Đối soát Tầng Frontend (Frontend Verification Harness)

### Phân tích 34 Vấn đề Frontend
Toàn bộ 34 vấn đề Frontend được chia thành 4 nhóm nghiệp vụ:

| Nhóm nghiệp vụ | Danh sách mục theo `CODE_REVIEW.md` | Gói sở hữu | Phương thức đối soát |
|----------------|-------------------------------------|------------|-----------------------|
| **Phân trang & Điều hướng** | #1 (Phân trang Order), #2 (Route `/table/layout` crash), #11 (Phân trang Table 200 dòng), #12 (Tải 1000 items client), #22 (Boilerplate pager copy) | RM-019, RM-024 | Kiểm tra `order.component.ts`, `app.routes.ts`, `table.component.ts`, kiểm tra route fallback `**`, component `<app-pager>`. |
| **Quản lý Trạng thái & Rò rỉ Bộ nhớ** | #3 (Memory leak `currentUser`), #8 (Sidebar interval 1s), #10 (Signals vs detectChanges), #16 (Nested subscribes 3 tầng) | RM-023, RM-024 | Kiểm tra `.pipe(take(1))`, `ngZone.runOutsideAngular`, Angular Signals `computed()`, loại bỏ subscribe lồng nhau. |
| **Bảo mật Giao diện & Quyền hạn** | #4 (Nút thiếu `*abpPermission`), #5 (Gửi price client), #7 (Encode role providerKey), #9 (Token SignalR), #19 (Role name hardcoded), #20 (XSS innerHTML) | RM-023, RM-024 | Rà soát template HTML trên 8 màn hình, kiểm tra `TableSignalRService` token factory, loại bỏ kiểm tra theo string role. |
| **Tái cấu trúc UI, i18n & Clean Code** | #6 (Proxy sửa tay), #13 (Trùng lặp Table Card), #14 (Hardcode text), #15 (Lỗi hiện 2 lần), #17 (Lệch ngày UTC), #18 (Client sinh mã đơn), #21 (Tách `inventory.component`), #23 (Template getter O(n^2)), #24 (ABP toaster), #25 (Dead code), #26 (Trộn 3 bộ UI), #27 (console.error), #28 (HttpClientModule), #29 (strict mode), #30 (Giờ mở cửa), #31 (Environment), #32 (SCSS 95KB & important), #33 (UI sửa storageType), #34 (i18n reload) | RM-023, RM-024, RM-025 | Kiểm tra `tsconfig.json` strict mode, từ điển `en.json`/`vi.json`, xóa bỏ component/thư mục chết, tối ưu SCSS. |

### Đánh giá Thực tế về Phân đoạn RM-024
- Tại thời điểm này, RM-024 đang ở trạng thái `chưa` trong roadmap, nhưng một phần đáng kể các mục liên quan đến bảo mật (#4, #7, #9, #19, #31), clean code (#25, #27, #28, #29), phân trang lỗi (#2) đã được xử lý sớm trong RM-019, RM-023 và RM-025.
- Cơ chế đối soát RM-027 sẽ phân loại trạng thái rành mạch giữa các mục đã hoàn tất và các mục còn lại của RM-024, tạo điều kiện cho việc nghiệm thu từng phần hoặc đóng gói toàn diện.

---

## 4. Thiết kế Ma trận Truy vết & Đối soát Kỹ thuật (Traceability Matrix Architecture)

### Lược đồ Ma trận (Matrix Schema)
Ma trận đối soát được chuẩn hóa thành bảng 68 dòng với các cột thông tin bắt buộc:
1. **Mã Issue**: `BE-01` đến `BE-34`, `FE-01` đến `FE-34`.
2. **Mức độ (Severity)**: 🔴 Nghiêm trọng (Critical), 🟡 Trung bình (Medium), 🟢 Nhỏ (Minor).
3. **Mô tả ngắn gọn (Issue Summary)**: Vấn đề được trích xuất từ `CODE_REVIEW.md`.
4. **Vị trí gốc (Original Location)**: File và số dòng trong báo cáo rà soát ban đầu.
5. **Gói giải pháp (Owning RM)**: `RM-019`, `RM-022`, `RM-023`, `RM-024`, `RM-025`, `RM-026`.
6. **Trạng thái thực tế (Status)**:
   - `VERIFIED (ĐÃ XÁC MINH)`: Đã khắc phục hoàn chỉnh, có bằng chứng code và test case xanh.
   - `IN PROGRESS (ĐANG XỬ LÝ)`: Đang hoàn thiện (thuộc phạm vi còn lại của RM-024).
   - `JUSTIFIED EXCEPTION (NGOẠI LỆ HỢP LỆ)`: Có giải pháp kiến trúc thay thế hoặc tính năng đã loại khỏi phạm vi theo quyết định đã chốt của Roadmap.
7. **Bằng chứng Mã nguồn (Code Evidence)**: Tệp tin và tên hàm/lớp hiện tại đang thực thi.
8. **Bằng chứng Kiểm thử (Test Evidence)**: Tên bài test tự động xUnit hoặc kịch bản kiểm tra giao diện.

---

## 5. Quy chuẩn Báo cáo Nghiệm thu Wave 5 (Sign-off Protocol)

### Tiêu chuẩn Phê duyệt Nghiệm thu (Verdict Rules)
- **APPROVED (Phê duyệt Tuyệt đối)**:
  - 100% (21/21) lỗi Nghiêm trọng (12 BE + 9 FE) đạt trạng thái `VERIFIED`.
  - 100% bài kiểm thử tự động Backend (200+ tests) PASS.
  - Biên dịch Backend và Frontend đạt 0 Errors.
  - Các lỗi Trung bình hoặc Nhỏ nếu còn tồn đọng phải được ghi nhận thành "Nợ kỹ thuật có kiểm soát" với kế hoạch xử lý rõ ràng.
- **CONDITIONAL APPROVAL (Phê duyệt Có điều kiện)**:
  - 100% Backend đạt `VERIFIED`.
  - Một số mục Frontend thuộc RM-024 đang hoàn thiện nhưng không ảnh hưởng đến tính toàn vẹn dữ liệu và an ninh hệ thống.
- **REJECTED (Từ chối Nghiệm thu)**:
  - Còn bất kỳ lỗi Nghiêm trọng 🔴 nào của Backend hoặc Frontend chưa được giải quyết.
  - Có bài test tự động nào bị fail hoặc crash runtime khi race condition.
