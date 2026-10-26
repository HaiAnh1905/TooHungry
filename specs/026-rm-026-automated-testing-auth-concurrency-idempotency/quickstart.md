# Hướng dẫn Khởi chạy & Kiểm thử Nhanh (Quickstart & Test Execution Guide): RM-026

**Tính năng**: `RM-026 Bộ Kiểm Thử Tự Động Phân Quyền & Bất Biến`  
**Ngày lập**: 2026-10-23 | **Tác giả**: ADAM

---

## 1. Giới thiệu

Tài liệu này cung cấp các lệnh CLI chuẩn xác để chạy, lọc và kiểm tra bộ kiểm thử tự động của ticket **RM-026**. Toàn bộ test suites được thiết kế để chạy độc lập trong bộ nhớ RAM qua SQLite In-Memory, bảo đảm tốc độ thực thi nhanh và không làm ảnh hưởng đến cơ sở dữ liệu thật của hệ thống.

---

## 2. Các Lệnh Chạy Kiểm Thử Toàn Diện (Full Solution Test Runs)

### 2.1. Chạy toàn bộ test suites trong giải pháp (Solution-wide)
```powershell
dotnet test d:\DFT\Acme.TooHungry\TooHungry.sln
```
*Kỳ vọng*: Toàn bộ các test suite từ Domain, Application và EntityFrameworkCore đều vượt qua thành công với kết quả **Passed: 100%, Failed: 0**.

### 2.2. Chạy riêng dự án kiểm thử Entity Framework Core (chứa toàn bộ test tích hợp thực tế)
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests
```
*Thời gian chạy ước tính*: 25 - 45 giây.

### 2.3. Chạy riêng dự án kiểm thử tầng Application
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.Application.Tests
```

---

## 3. Các Lệnh Chạy Kiểm Thử Theo Từng Nhóm Chức Năng (Targeted Filtering)

Sử dụng cờ `--filter` để chạy nhanh từng nhóm kiểm thử cụ thể khi đang phát triển hoặc debug:

### 3.1. Nhóm 1: Kiểm thử Phân quyền Thời gian chạy (Authorization Tests)
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests --filter "FullyQualifiedName~Security|FullyQualifiedName~Authorization"
```
*Mục tiêu*: Xác thực các API ném `AbpAuthorizationException` khi Unauthenticated hoặc thiếu quyền; kiểm tra ma trận phân quyền Waiter, InventoryKeeper, Admin.

### 3.2. Nhóm 2: Kiểm thử Bất biến & Khử Trừ Kho Lặp Lại (Idempotency Tests)
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests --filter "FullyQualifiedName~Idempotency"
```
*Mục tiêu*: Khẳng định việc gọi `CompletePaymentAsync` hoặc `UpdateAsync(Completed)` lần thứ 2 bị ném `TooHungry:Order:AlreadyCompleted` và kho hàng tuyệt đối không bị trừ lần 2.

### 3.3. Nhóm 3: Kiểm thử Tương tranh Tạo đơn & Trừ kho Đa luồng (Concurrency Tests)
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests --filter "FullyQualifiedName~Concurrency"
```
*Mục tiêu*: Giả lập 2 waiter cùng submit đơn trên cùng 1 bàn và nhiều đơn cùng trừ kho FEFO, bảo đảm không bị crash 500 và số dư kho chính xác.

### 3.4. Nhóm 4: Kiểm thử Chuyển bàn, Gộp bàn & Hủy đơn (Table Flow Tests)
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests --filter "FullyQualifiedName~Table"
```
*Mục tiêu*: Kiểm tra `TransferTableAsync` kế thừa `OccupiedTime`; `MergeTablesAsync` bảo toàn ghi chú và giá niêm yết CSDL; `CancelActiveOrderAsync` giải phóng bàn về Available.

### 3.5. Nhóm 5: Kiểm thử Cân đối Kiểm kê & Thuật toán FEFO (Inventory & FEFO Tests)
```powershell
dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests --filter "FullyQualifiedName~Fefo|FullyQualifiedName~StockAdjustment"
```
*Mục tiêu*: Kiểm tra `StockAdjustment` sinh lô có giá vốn và hạn sử dụng theo StorageType; kiểm tra thuật toán FEFO ưu tiên trừ lô có hạn dùng gần nhất trước.

---

## 4. Chẩn đoán & Gỡ rối Khi Kiểm thử Thất bại (Troubleshooting)

Khi có test case bị `Failed`, thực hiện theo các bước sau để xác định nguyên nhân:

1. **Hiển thị chi tiết stack trace và log CSDL**:
   ```powershell
   dotnet test d:\DFT\Acme.TooHungry\test\Acme.TooHungry.EntityFrameworkCore.Tests --filter "DisplayName=<Tên_Method_Bị_Lỗi>" --logger "console;verbosity=detailed"
   ```
2. **Kiểm tra ngoại lệ ném ra**:
   - Nếu lỗi là `AbpAuthorizationException`: Kiểm tra xem người dùng giả lập trong test đã được cấp quyền phù hợp hay chưa (hoặc ngược lại, action có thiếu `[Authorize]` không).
   - Nếu lỗi là `InvalidOperationException: A second operation was started on this context instance`: Kiểm tra xem test concurrency có đang dùng chung DbContext thay vì tạo DI scope mới qua `IServiceScopeFactory.CreateScope()` hay không.
   - Nếu lỗi là `BusinessException`: So sánh mã lỗi (`ex.Code`) với định nghĩa trong `TooHungryDomainErrorCodes.cs` và từ điển đa ngôn ngữ `vi.json` / `en.json`.
   - Nếu số lượng tồn kho `RemainingQuantity` bị lệch: Kiểm tra xem đơn hàng có bị trừ kho lặp lại (vi phạm Idempotency) hay không.

---

## 5. Tích hợp Đường ống CI/CD (Continuous Integration Pipeline)

Trong GitHub Actions hoặc Azure DevOps Pipeline, cấu hình bước kiểm thử với cờ `--no-build` để tối ưu thời gian:
```yaml
- name: Run RM-026 Automated Test Suite
  run: dotnet test test/Acme.TooHungry.EntityFrameworkCore.Tests/Acme.TooHungry.EntityFrameworkCore.Tests.csproj --configuration Release --no-build --verbosity normal --logger "trx;LogFileName=test_results.trx"
```
Bộ kiểm thử hoàn tất là điều kiện tiên quyết để merge code vào nhánh `main` hoặc `dev`.
