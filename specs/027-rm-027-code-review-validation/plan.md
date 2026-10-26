# Kế hoạch Triển khai (Implementation Plan): RM-027 Kiểm định & Đối soát Toàn diện Mã nguồn so với Code Review (Code Review Verification & Audit)

**Nhánh (Branch)**: `027-rm-027-code-review-validation` | **Ngày**: 2026-10-26 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/027-rm-027-code-review-validation/spec.md` với mục tiêu thiết lập cổng kiểm định độc lập, đối soát toàn diện và nghiệm thu chất lượng kỹ thuật của 68 tiêu chí mã nguồn từ [CODE_REVIEW.md](../../CODE_REVIEW.md).

---

## Tóm tắt (Summary)

Kế hoạch triển khai **RM-027** hiện thực hóa quy trình kiểm định và đối soát kỹ thuật toàn diện cho Wave 5 (System Hardening & Code Review Refactoring). Thay vì chỉ kiểm tra thủ công, kế hoạch này áp dụng mô hình kiểm định kép **Dual-Gate Verification Framework** kết hợp giữa **Giám định Tĩnh (Static Code Inspection)** và **Xác minh Động qua Kiểm thử Tự động (Dynamic Automated Verification)**:
1. **Đối soát Backend (34 mục)**: Rà soát và xác thực 100% các giải pháp đã áp dụng cho 12 lỗi Nghiêm trọng 🔴 (#1 - #12), 19 lỗi Trung bình 🟡 (#13 - #31) và 3 lỗi Nhỏ 🟢 (#32 - #34). Khẳng định tính đúng đắn qua bộ test xUnit tự động (> 200 tests) chạy xanh 100%.
2. **Đối soát Frontend (34 mục)**: Rà soát 9 lỗi Nghiêm trọng 🔴 (#1 - #9), 15 lỗi Trung bình 🟡 (#10 - #24) và 10 lỗi Nhỏ 🟢 (#25 - #34). Phân loại rành mạch các mục đã hoàn tất qua RM-019/RM-023/RM-025 và các mục thuộc phân đoạn còn lại của RM-024.
3. **Ma trận Truy vết & Đối soát Kỹ thuật (Traceability Matrix)**: Xây dựng bảng tra cứu 68 dòng đối chiếu mã lỗi ↔ file/hàm thực tế ↔ bài test chứng minh ↔ trạng thái nghiệm thu.
4. **Biên bản Nghiệm thu Kỹ thuật (Sign-off Report)**: Tổng kết hiện trạng chất lượng mã nguồn, chứng nhận hệ thống đạt chuẩn an toàn, toàn vẹn và sẵn sàng bàn giao theo Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md).

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ & Nền tảng**: C# 13, .NET 10.0 SDK, ABP Framework 9.x, TypeScript 5.x, Angular Standalone (ABP Angular template), SCSS
- **Framework Kiểm thử**: xUnit, Shouldly, NSubstitute, Vitest / Angular Test Harness
- **Cơ sở Dữ liệu & ORM**: EF Core, SQLite In-Memory (`Volo.Abp.EntityFrameworkCore.Sqlite`)
- **Mục tiêu Hiệu suất**:
  - Thời gian thực thi toàn bộ test suites kiểm định < 60 giây.
  - Thời gian rà soát và đối chiếu ma trận < 1 phiên làm việc.
  - Zero Flakiness (độ ổn định kiểm thử 100%).
- **Ràng buộc Chất lượng**:
  - 100% test cases tự động Backend phải PASS.
  - 0 lỗi Nghiêm trọng (🔴) tồn đọng ở cả Backend và Frontend.
  - Tuân thủ nghiêm ngặt Hiến pháp kỹ thuật [constitution.md](../../.specify/memory/constitution.md): Domain-Driven Design, ABP Layering, Non-blocking Async, Granular Authorization, i18n song ngữ 100% trong `en.json` và `vi.json`.
  - Tài liệu đặc tả, kế hoạch, ma trận đối soát và biên bản nghiệm thu BẮT BUỘC bằng **Tiếng Việt** (Điều khoản VIII).

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Đánh giá theo Hiến pháp [constitution.md](../../.specify/memory/constitution.md) - Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design (DDD) & Cấu trúc Phân lớp ABP**:
  - Kế hoạch kiểm định xác thực trực tiếp việc chuyển dịch logic từ Application Services sang Rich Domain Model (`Order.Complete()`, `Table.Occupy()`, `Table.Release()`).
- [x] **II. UML & Sự Đồng nhất của Domain Model**:
  - Ma trận đối soát kiểm tra tính tương thích giữa mã nguồn thực tế và mô hình nghiệp vụ nhà hàng trong `RMS-TH.vpp`.
- [x] **III. Test-First & Cổng Chất lượng Tự động (KHÔNG THỂ THƯƠNG LƯỢNG)**:
  - RM-027 đóng vai trò là chốt chặn cuối cùng kiểm tra toàn bộ kết quả của nguyên tắc Test-First, bảo đảm không có bài test nào bị bỏ qua hoặc thất bại.
- [x] **IV. Hợp đồng API Nghiêm ngặt & Tích hợp Module Angular**:
  - Xác thực việc loại bỏ các trường thừa khỏi DTO, xóa custom code khỏi thư mục `proxy/`, và định kiểu mạnh trong giao tiếp client-server.
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy Mặc định**:
  - Kiểm định toàn diện việc gắn `[Authorize]` hạt nhân, bảo vệ SignalR Realtime Hub bằng token, dọn sạch secrets khỏi Git repository.
- [x] **VI. Sự Nhất quán của UI/UX & Hệ thống Thiết kế (Cam & Trắng)**:
  - Rà soát việc tối ưu hóa SCSS, loại bỏ `!important` lạm dụng và đồng bộ hóa các thành phần bảng/thẻ bàn.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - Kiểm tra 100% chuỗi văn bản và toast messages được định nghĩa đồng bộ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu (Documentation Language)**:
  - Toàn bộ hồ sơ kế hoạch, nghiên cứu, hợp đồng và ma trận đối soát được viết bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (`specs/027-rm-027-code-review-validation/`)

```text
specs/027-rm-027-code-review-validation/
├── spec.md                                     # Đặc tả nghiệp vụ và tiêu chí kiểm định RM-027
├── plan.md                                     # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                                 # Nghiên cứu phương pháp luận kiểm định Phase 0
├── data-model.md                               # Mô hình thực thể và máy trạng thái đối soát Phase 1
├── quickstart.md                               # Hướng dẫn chạy kiểm định từng bước Phase 1
├── contracts/
│   ├── verification-matrix-contract.md         # Hợp đồng ma trận đối soát 68 tiêu chí Phase 1
│   └── audit-report-contract.md               # Hợp đồng biên bản nghiệm thu kỹ thuật Phase 1
└── checklists/
    └── requirements.md                         # Bảng kiểm định chất lượng đặc tả (Đạt 100% PASS)
```

### Phạm vi Mã nguồn Được Rà soát & Kiểm định

```text
# 1. Tầng Backend (.NET / ABP)
src/Acme.TooHungry.Domain/                     # Kiểm tra Rich Domain entities (Order, Table, Inventory)
src/Acme.TooHungry.Application.Contracts/     # Kiểm tra DTO validations, loại bỏ mass assignment
src/Acme.TooHungry.Application/               # Kiểm tra AppServices (Order, Table, Inventory, Forecast)
src/Acme.TooHungry.EntityFrameworkCore/       # Kiểm tra DbContext, Filtered Indexes, Migrations
src/Acme.TooHungry.HttpApi.Host/              # Kiểm tra SignalR Hubs, Controllers, appsettings secrets
test/Acme.TooHungry.Application.Tests/        # Chạy toàn bộ test suites phân quyền, tương tranh, bất biến
test/Acme.TooHungry.EntityFrameworkCore.Tests/# Chạy toàn bộ runner SQLite In-Memory

# 2. Tầng Frontend (Angular)
angular/src/app/order/                        # Kiểm tra phân trang giữ totalCount, bỏ gửi unitPrice
angular/src/app/table/                        # Kiểm tra phân trang server-side, route /tables
angular/src/app/inventory/                    # Kiểm tra modular hóa component kho
angular/src/app/shared/                       # Kiểm tra TableStateService, TableCard, Pager, i18n
angular/src/assets/i18n/                      # Kiểm tra vi.json và en.json
angular/tsconfig.json                         # Kiểm tra TypeScript strict mode
```

---

## Theo dõi Độ phức tạp (Complexity Tracking)

> *Không có vi phạm nào đối với Hiến pháp kỹ thuật. Mọi thiết kế đều tuân thủ nguyên tắc chuẩn mực của ABP Framework và Angular.*

| Tiêu chí | Đánh giá Tuân thủ | Biện minh Kiến trúc |
|----------|-------------------|---------------------|
| Khung làm việc | Chuẩn ABP & Angular | Tận dụng test runner có sẵn của ABP, không cài đặt thêm tool bên thứ 3 phức tạp. |
| Cơ sở dữ liệu | SQLite In-Memory | Tốc độ chạy test cao (< 60s), độc lập và cách ly hoàn toàn. |
| Quản lý trạng thái | Angular Signals | Đơn giản hóa, triệt tiêu rò rỉ bộ nhớ từ RxJS subscription không giải phóng. |
