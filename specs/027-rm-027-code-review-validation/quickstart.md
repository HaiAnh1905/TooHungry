# Hướng dẫn Khởi chạy & Đối soát Nhanh (Quickstart Validation Guide): RM-027

**Mã Tính năng**: `RM-027`  
**Ngày thực hiện**: 2026-10-26  
**Mục tiêu**: Cung cấp kịch bản kiểm tra thực tế từng bước để xác minh 68 tiêu chí mã nguồn so với `CODE_REVIEW.md`.

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

- **Môi trường Backend**: .NET 10.0+ SDK đã cài đặt, kết nối được CSDL thử nghiệm SQLite.
- **Môi trường Frontend**: Node.js v18/v20+, npm đã cài đặt.
- **Quyền hạn Terminal**: Quyền chạy lệnh PowerShell trong thư mục gốc `d:\DFT\Acme.TooHungry`.

---

## 2. Các Bước Thực thi Kiểm định & Đối soát

### Bước 1: Kiểm tra Biên dịch Sạch Toàn Dự án (Clean Build Verification)

Xác nhận mã nguồn không còn lỗi biên dịch cú pháp hoặc vi phạm kiểu dữ liệu.

```powershell
# 1. Biên dịch Backend .NET
dotnet build Acme.TooHungry.slnx -c Release

# Kết quả mong đợi:
# Build succeeded.
# 0 Warning(s) nghiêm trọng, 0 Error(s)
```

```powershell
# 2. Kiểm tra biên dịch Frontend Angular với TypeScript strict mode
cd angular
npm run build -- --configuration production

# Kết quả mong đợi:
# Application bundle generation complete.
# 0 TypeScript type errors
```

---

### Bước 2: Thực thi Toàn bộ Bộ Kiểm thử Tự động Backend (Automated Tests Runner)

Chạy toàn bộ các bộ test tự động kiểm thử phân quyền, tranh chấp và tính bất biến đã được xây dựng từ RM-022 đến RM-026.

```powershell
# Chạy toàn bộ test suites trong thư mục test/
dotnet test test/Acme.TooHungry.Application.Tests/Acme.TooHungry.Application.Tests.csproj --logger "console;verbosity=normal"
dotnet test test/Acme.TooHungry.EntityFrameworkCore.Tests/Acme.TooHungry.EntityFrameworkCore.Tests.csproj --logger "console;verbosity=normal"
dotnet test test/Acme.TooHungry.Domain.Tests/Acme.TooHungry.Domain.Tests.csproj --logger "console;verbosity=normal"

# Kết quả mong đợi:
# Total tests: > 200. Passed: 100%. Failed: 0. Skipped: 0.
```

---

### Bước 3: Kiểm định Trọng điểm các Lỗi Nghiêm trọng Backend (Critical BE Invariants)

Chạy riêng các bài test xác nhận trực tiếp 12 lỗi Nghiêm trọng (🔴 #1 - #12):

```powershell
# 1. Kiểm tra tính bất biến: Không trừ kho 2 lần khi hoàn tất đơn (BE #1)
dotnet test --filter "FullyQualifiedName~OrderAppService_Idempotency_Tests"

# 2. Kiểm tra tính giá phía server & DTO validation (BE #2, BE #3)
dotnet test --filter "FullyQualifiedName~OrderAppService_Pricing_Tests|FullyQualifiedName~OrderAppService_Hardening_Tests"

# 3. Kiểm tra retry concurrency và chống race condition tạo đơn (BE #5, BE #12)
dotnet test --filter "FullyQualifiedName~OrderAppService_RaceCondition_Tests|FullyQualifiedName~InventoryManager_Fefo_Concurrency_Tests"

# 4. Kiểm tra phân quyền thời gian chạy (BE #6, BE #7, BE #8, BE #9)
dotnet test --filter "FullyQualifiedName~EndpointAuthorization_Runtime_Tests"
```

---

### Bước 4: Giám định Tĩnh Mã nguồn Rác & Bảo mật (Sanitation & Secrets Inspection)

Chạy các lệnh kiểm tra xác nhận đã xóa file rác và dọn dẹp secrets khỏi Git repository:

```powershell
# 1. Xác nhận các file rác gốc không còn tồn tại
Test-Path test.cs, Reflect.cs, fix.js, translate.js, perf-test.ps1, Logs/logs.txt

# Kết quả mong đợi: Trả về False cho tất cả các file rác.

# 2. Xác nhận không còn hardcoded secrets trong appsettings.json
Select-String -Path "src/Acme.TooHungry.HttpApi.Host/appsettings.json" -Pattern "CertificatePassPhrase", "DefaultPassPhrase"

# Kết quả mong đợi: Không tìm thấy chuỗi mật khẩu hardcode (đã chuyển sang biến môi trường hoặc example).
```

---

### Bước 5: Đối chiếu Ma trận & Xuất bản Báo cáo Nghiệm thu (Traceability & Sign-off)

1. Mở tệp ma trận đối soát tại [contracts/verification-matrix-contract.md](contracts/verification-matrix-contract.md).
2. Đối chiếu từng dòng với mã nguồn thực tế và kết quả chạy test ở Bước 2 & Bước 3.
3. Điền kết quả vào mẫu báo cáo nghiệm thu [contracts/audit-report-contract.md](contracts/audit-report-contract.md).
4. Phê duyệt kết luận nghiệm thu Wave 5.
