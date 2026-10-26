# Hướng dẫn Xác thực & Kiểm thử Nhanh (Quickstart & Verification Guide): RM-025 Tối ưu Hóa Truy vấn Cơ sở Dữ liệu & Clean Code

**Mã Tính năng**: `RM-025`  
**Ngày lập**: 2026-10-23  
**Tác giả**: ADAM (Antigravity AI Assistant)  
**Tài liệu Đầu vào**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md)

---

## 1. Chuẩn bị Môi trường Kiểm thử

Bảo đảm các tiến trình máy chủ đang hoạt động hoặc sẵn sàng biên dịch:
```powershell
# 1. Kiểm tra biên dịch Backend .NET
cd d:\DFT\Acme.TooHungry
dotnet build

# 2. Tạo và áp dụng Migration mới cho các Indexes của RM-025
cd d:\DFT\Acme.TooHungry\src\Acme.TooHungry.EntityFrameworkCore
dotnet ef migrations add Add_RM025_Indexes_And_Optimizations -s ..\Acme.TooHungry.HttpApi.Host
dotnet run --project ..\Acme.TooHungry.DbMigrator

# 3. Kiểm tra biên dịch Frontend Angular với chế độ Strict Mode
cd d:\DFT\Acme.TooHungry\angular
npm run build
```

---

## 2. Các Kịch bản Xác thực Trọng yếu (Verification Scenarios)

### Kịch bản 1: Xác thực Triệt tiêu N+1 Query & Over-fetching
- **Mục tiêu**: Chứng minh các lệnh tra cứu món ăn và đơn vị tính đã được gom nhóm qua Map/Dictionary, không còn phát sinh truy vấn N+1 lặp lại.
- **Thao tác**:
  1. Đăng nhập tài khoản Quản lý vào hệ thống.
  2. Mở màn hình Dự báo nhu cầu (`/forecast`) và mở bản ghi dự báo có từ 20 món ăn trở lên.
  3. Bật cửa sổ Terminal hoặc công cụ xem log SQL (Output của `Acme.TooHungry.HttpApi.Host`).
  4. Quan sát các câu lệnh SQL sinh ra bởi `GetFinancialSummaryAsync` và `GetByForecastIdAsync`.
- **Kết quả Mong đợi**:
  - Chỉ xuất hiện duy nhất 1 câu lệnh `SELECT ... FROM AppDishes WHERE Id IN (...)` và 1 câu lệnh `SELECT ... FROM AppIngredients WHERE Id IN (...)`.
  - Không có bất kỳ vòng lặp `SELECT ... FROM AppDishes WHERE Id = @p0` nào chạy $N$ lần.

---

### Kịch bản 2: Xác thực Không Còn Truy Vấn Đồng Bộ Chặn Luồng (Non-blocking Async)
- **Mục tiêu**: Đảm bảo không còn bất kỳ lệnh `.ToList()`, `.FirstOrDefault()`, `.First()` đồng bộ nào chạy trên `IQueryable` tại `TableAppService` và `InventoryManager`.
- **Thao tác**:
  1. Chạy phân tích tĩnh hoặc rà soát mã nguồn:
     ```powershell
     cd d:\DFT\Acme.TooHungry\src
     # Kiểm tra không còn ToList() hoặc FirstOrDefault() trần trên Repository/Queryable
     Get-ChildItem -Path .\Acme.TooHungry.Application\Tables, .\Acme.TooHungry.Domain\Inventories -Filter "*.cs" -Recurse | Select-String "\.ToList\(\)", "\.FirstOrDefault\(\)"
     ```
  2. Thực hiện gộp 2 bàn ăn (`MergeTablesAsync`) và xuất kho trừ nguyên liệu (`DeductFefoAsync`).
- **Kết quả Mong đợi**:
  - Không có kết quả nào vi phạm lệnh đồng bộ trên CSDL.
  - 100% các câu lệnh đều sử dụng `await AsyncExecuter.ToListAsync(...)` hoặc `await AsyncExecuter.FirstOrDefaultAsync(...)`.

---

### Kịch bản 3: Xác thực Phân trang Phía Máy chủ cho Lịch sử Kho Hàng
- **Mục tiêu**: Kiểm tra API `GetTransactionsAsync` trả về đúng trang dữ liệu theo `SkipCount` và `MaxResultCount`.
- **Thao tác**:
  1. Sử dụng Swagger (`/swagger`) hoặc gọi API:
     ```http
     GET /api/app/inventory/transactions?ingredientId={id}&skipCount=0&maxResultCount=5
     ```
  2. Gọi tiếp trang thứ hai:
     ```http
     GET /api/app/inventory/transactions?ingredientId={id}&skipCount=5&maxResultCount=5
     ```
- **Kết quả Mong đợi**:
  - Phản hồi trả về cấu trúc `PagedResultDto<InventoryTransactionDto>` có `totalCount` tổng thể chính xác (ví dụ 50).
  - Mảng `items` của mỗi request trả về đúng tối đa 5 phần tử tương ứng, được sắp xếp theo thời gian tạo mới nhất (`CreationTime DESC`).

---

### Kịch bản 4: Xác thực Filtered Unique Index cho Recipe & Cơ Chế Clone Snapshot
- **Mục tiêu**: Đảm bảo mỗi món ăn chỉ có tối đa 1 công thức active và phiên bản cũ được clone snapshot an toàn.
- **Thao tác**:
  1. Mở màn hình Công thức món ăn (`/recipes`), chọn một món ăn đang có công thức hoạt động (Version 1).
  2. Bấm "Chỉnh sửa công thức", thay đổi số lượng nguyên liệu và bấm "Lưu".
  3. Kiểm tra trong cơ sở dữ liệu:
     ```sql
     SELECT Id, DishId, Name, Version, IsActive, DeactivationReason 
     FROM AppRecipes 
     WHERE DishId = '{DishId}' 
     ORDER BY Version DESC;
     ```
- **Kết quả Mong đợi**:
  - Xuất hiện 2 bản ghi:
    * Bản ghi 1: `Version = 2`, `IsActive = 1` (Công thức hoạt động chính thức mới).
    * Bản ghi 2: `Version = 1`, `IsActive = 0`, `DeactivationReason` chứa nội dung lưu vết lịch sử.
  - Thử chạy câu lệnh SQL chèn thủ công một bản ghi thứ 3 có cùng `DishId` và `IsActive = 1`: SQL Server từ chối ngay lập tức do vi phạm Unique Filtered Index `IX_AppRecipes_DishId_IsActive_Unique_Active`.

---

### Kịch bản 5: Xác thực Mã Số Nghiệp Vụ An Toàn Kèm Salt Chống Trùng
- **Mục tiêu**: Xác minh mã đơn hàng và mã lô kho sinh ra luôn duy nhất trong cùng một giây.
- **Thao tác**:
  1. Thực hiện tạo nhanh 5 đơn hàng liên tiếp bằng script hoặc kiểm thử tương tranh.
  2. Kiểm tra mã `OrderNumber` của 5 đơn hàng vừa tạo:
     ```sql
     SELECT TOP 5 OrderNumber, CreationTime FROM AppOrders ORDER BY CreationTime DESC;
     ```
- **Kết quả Mong đợi**:
  - Mã đơn hàng có định dạng chuẩn: `ORD-20261023HHMMSS-XXXX` (ví dụ `ORD-20261023140500-4F2A`, `ORD-20261023140500-9B1C`).
  - 100% các mã số không bị trùng lặp dù được tạo trong cùng 1 giây.

---

### Kịch bản 6: Xác thực Song Ngữ 100% & Triệt Tiêu Exception Hardcode
- **Mục tiêu**: Kiểm tra không còn câu chữ tiếng Việt nào bị viết cứng phía máy chủ khi chuyển đổi ngôn ngữ sang Tiếng Anh.
- **Thao tác**:
  1. Chuyển ngôn ngữ giao diện sang Tiếng Anh (`en`).
  2. Thực hiện hành vi vi phạm nghiệp vụ bàn ăn (ví dụ cố ý chuyển trạng thái một bàn đang có khách ngồi).
  3. Quan sát thông điệp lỗi trả về trên Toast/Modal.
- **Kết quả Mong đợi**:
  - Thông báo hiển thị Tiếng Anh hoàn hảo: *"Table is currently occupied; cannot edit table information!"*.
  - Kiểm tra mã nguồn không còn từ khóa `UserFriendlyException("...")` chứa tiếng Việt hardcode nào trong toàn bộ dự án.

---

### Kịch bản 7: Xác thực Vệ Sinh Mã Rác & Chế Độ TypeScript Strict Mode
- **Mục tiêu**: Đảm bảo thư mục gốc sạch sẽ và Angular đạt tiêu chuẩn strict mode.
- **Thao tác**:
  1. Kiểm tra thư mục gốc: xác nhận các tệp `test.cs`, `Reflect.cs`, `fix.js`, `translate.js`, `perf-test.ps1`, `Logs/logs.txt` đã biến mất hoàn toàn.
  2. Kiểm tra các thư mục mồ côi trên Angular (`auth/login`, `shared/layout`, `shared-modal`, `shared-spinner`, `shared-module.ts`, `e2e/`): đã bị xóa sạch.
  3. Chạy lệnh:
     ```powershell
     cd d:\DFT\Acme.TooHungry\angular
     npm run build
     ```
- **Kết quả Mong đợi**:
  - Lệnh build hoàn tất với trạng thái `Build at: ... - Hash: ... - Time: ...ms`.
  - Không có bất kỳ lỗi biên dịch TypeScript nào.
