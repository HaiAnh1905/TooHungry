# Hợp đồng Định dạng Ma trận Đối soát (Verification Matrix Contract): RM-027

**Mã Tính năng**: `RM-027`  
**Ngày thực hiện**: 2026-10-26  
**Mục tiêu**: Định nghĩa cấu trúc hợp đồng chuẩn mực cho Ma trận Truy vết & Đối soát Kỹ thuật (Traceability & Verification Matrix) bao phủ toàn bộ 68 mục của `CODE_REVIEW.md`.

---

## 1. Cấu trúc Bảng Ma trận Đối soát 68 Tiêu chí

Mỗi bảng ma trận đối soát trong tài liệu nghiệm thu BẮT BUỘC phải tuân thủ chuẩn Markdown Table với 8 cột như sau:

```markdown
| Mã Issue | Mức độ | Vấn đề & Hậu quả | Vị trí Gốc | Gói RM | Hiện trạng Mã nguồn & Giải pháp Thực tế | Bài Test Chứng minh | Trạng thái |
|----------|--------|------------------|------------|--------|-----------------------------------------|---------------------|------------|
| BE-01 | 🔴 | Trừ kho 2 lần khi sửa đơn Completed | `OrderAppService.cs:213` | RM-022 | `Order.Complete()` trong Domain đóng setter, chặn trừ kho lần 2 | `OrderAppService_Idempotency_Tests` | VERIFIED |
```

### Quy ước Định dạng Cột:
1. **Mã Issue**: `BE-01` đến `BE-34` cho Backend; `FE-01` đến `FE-34` cho Frontend.
2. **Mức độ**:
   - `🔴` : Lỗi Nghiêm trọng (Critical).
   - `🟡` : Lỗi Trung bình (Medium).
   - `🟢` : Lỗi Nhỏ (Minor).
3. **Vấn đề & Hậu quả**: Tóm tắt 1-2 câu giải thích rõ bản chất kỹ thuật của vấn đề.
4. **Vị trí Gốc**: Đường dẫn file và dòng code được trích dẫn từ `CODE_REVIEW.md`.
5. **Gói RM**: Mã gói giải pháp đảm nhiệm (`RM-019`, `RM-022`, `RM-023`, `RM-024`, `RM-025`, `RM-026`).
6. **Hiện trạng Mã nguồn & Giải pháp Thực tế**: Tên file, tên lớp/hàm hiện tại trong repository và mô tả vắn tắt cách thức đã xử lý.
7. **Bài Test Chứng minh**: Tên test method hoặc test class xUnit/Vitest xác thực tính đúng đắn.
8. **Trạng thái**:
   - `VERIFIED`: Đã kiểm định hoàn tất đạt yêu cầu 100%.
   - `IN_PROGRESS`: Đang trong lộ trình hoàn thiện (thuộc các phần còn lại của RM-024).
   - `JUSTIFIED_EXCEPTION`: Ngoại lệ có giải trình kiến trúc hợp lý.

---

## 2. Quy tắc Đánh giá Tiêu chuẩn Hợp đồng (Validation Rules)

1. **Tính Bao phủ Tuyệt đối**: Ma trận BẮT BUỘC phải có đúng **68 dòng dữ liệu** (34 dòng Backend, 34 dòng Frontend), không được gộp nhiều mục thành một dòng.
2. **Ràng buộc Lỗi Nghiêm trọng**:
   - 12 dòng `BE-01` đến `BE-12` BẮT BUỘC phải đạt trạng thái `VERIFIED`.
   - Các dòng Nghiêm trọng Frontend `FE-01` đến `FE-09` nếu chưa hoàn thiện 100% phải được đánh dấu rõ `IN_PROGRESS` và liệt kê vào bảng hành động cần xử lý.
3. **Tính Khả chứng (Verifiability)**:
   - Cột `Hiện trạng Mã nguồn` phải trỏ tới file/hàm có thực trong repository tại thời điểm chạy kiểm định.
   - Cột `Bài Test Chứng minh` phải tương ứng với test method có thực thi và trả về `Passed` trong `dotnet test`.

---

## 3. Mẫu Dữ liệu Phân đoạn Backend (Backend Partition Sample)

```markdown
### Ma trận Đối soát Backend (34 Mục)

| Mã Issue | Mức độ | Vấn đề & Hậu quả | Vị trí Gốc | Gói RM | Hiện trạng Mã nguồn & Giải pháp Thực tế | Bài Test Chứng minh | Trạng thái |
|---|---|---|---|---|---|---|---|
| BE-01 | 🔴 | Trừ kho 2 lần khi sửa đơn Completed | `OrderAppService.cs:213` | RM-022 | `Order.Complete()` kiểm tra trạng thái cũ, chỉ trừ kho khi chuyển sang Completed | `OrderAppService_Idempotency_Tests` | VERIFIED |
| BE-02 | 🔴 | Client tự đặt giá qua DTO | `OrderAppService.cs:127` | RM-022 | Xóa UnitPrice/TotalAmount khỏi DTO, server tự tính giá từ Dish.Price | `OrderAppService_Pricing_Tests` | VERIFIED |
| BE-03 | 🔴 | DTO thiếu validation (Quantity âm) | `OrderDtos.cs:19` | RM-022 | Bổ sung `[Range(1, 999)] Quantity`, `[MinLength(1)] Items` | `OrderAppService_Hardening_Tests` | VERIFIED |
| BE-04 | 🔴 | Tồn kho nhân đôi ConversionFactor | `ForecastAppServices.cs:366` | RM-022 | Tính tổng `Sum(b => b.RemainingQuantity)` chuẩn đơn vị cơ sở | `ForecastAppService_Hardening_Tests` | VERIFIED |
| BE-05 | 🔴 | Retry concurrency trừ kho thừa | `OrderAppService.cs:373` | RM-022 | Mở UoW độc lập mới trong vòng retry khấu trừ FEFO | `InventoryManager_Fefo_Concurrency_Tests` | VERIFIED |
| BE-06 | 🔴 | Upload Cloudinary không cần đăng nhập | `MediaController.cs:22` | RM-023 | Gắn `[Authorize(Dishes.Edit)]` và bộ lọc `SafeImageFileValidator` | `EndpointAuthorization_Runtime_Tests` | VERIFIED |
| BE-07 | 🔴 | DailyMenu không có Authorize | `DailyMenuAppService.cs:13` | RM-023 | Bổ sung `[Authorize(Dishes.Default)]` cho service | `EndpointAuthorization_Runtime_Tests` | VERIFIED |
| BE-08 | 🔴 | Recipe by-dish và complete thiếu quyền | `RecipeController.cs:37` | RM-023 | Gắn quyền `Recipes.Default` và `Orders.Edit` cho từng endpoint | `EndpointAuthorization_Runtime_Tests` | VERIFIED |
| BE-09 | 🔴 | Order và DishCategory thiếu quyền cụ thể | `OrderAppService.cs:24` | RM-023 | Gắn quyền chi tiết `Orders.Delete`, `DishCategories.Delete` cho từng method | `EndpointAuthorization_Runtime_Tests` | VERIFIED |
| BE-10 | 🔴 | Mass assignment ghi đè trạng thái bàn | `TableAppService.cs:302` | RM-022 | Bỏ Status/OccupiedTime khỏi DTO, đổi qua domain `table.Occupy()` | `TableAppService_Status_Tests` | VERIFIED |
| BE-11 | 🔴 | SignalR gửi trước commit transaction | `OrderAppService.cs:154` | RM-022 | Đưa vào hook `CurrentUnitOfWork.OnCompleted` | `OrderAppService_Hardening_Tests` | VERIFIED |
| BE-12 | 🔴 | Race condition ném 500 khi tạo đơn | `OrderAppService.cs:533` | RM-022 | Filtered unique index trên Orders, bắt DbUpdateException ném BusinessException | `OrderAppService_RaceCondition_Tests` | VERIFIED |
```
