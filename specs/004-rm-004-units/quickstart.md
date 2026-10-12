# Hướng dẫn Kiểm thử & Xác minh (Quickstart Validation Guide): Quản lý Đơn vị tính (RM-004)

**Tính năng**: `004-rm-004-units`
**Ngày tạo**: 2026-10-08
**Mục đích**: Hướng dẫn các kịch bản kiểm thử chạy được (runnable) để xác minh tính năng hoạt động trơn tru end-to-end từ Backend tới Frontend.

---

## 1. Yêu cầu Tiên quyết (Prerequisites)

1. **Backend**:
   - .NET 10.0+ SDK đã cài đặt.
   - Cơ sở dữ liệu đã chạy migration (`dotnet run` trong `Acme.TooHungry.DbMigrator`).
   - Host API đang chạy (`dotnet run` trong `src/Acme.TooHungry.HttpApi.Host`, cổng `https://localhost:44305`).
2. **Frontend**:
   - Node.js v18/v20.
   - Angular dev server đang chạy (`npm start` trong thư mục `angular`, cổng `http://localhost:4200`).
3. **Tài khoản**: Đăng nhập bằng tài khoản mang Role `Administrator` (hoặc Role có quyền `TooHungry.Units.*`).

---

## 2. Kiểm thử Tự động (Automated Tests)

Chạy các kiểm thử tầng Domain và Application để xác minh logic nghiệp vụ:

```bash
# Kiểm thử Application Service của Units
dotnet test test/Acme.TooHungry.Application.Tests/Acme.TooHungry.Application.Tests.csproj --filter "FullyQualifiedName~Units"

# Kiểm thử EF Core của Units (nếu có)
dotnet test test/Acme.TooHungry.EntityFrameworkCore.Tests/Acme.TooHungry.EntityFrameworkCore.Tests.csproj --filter "FullyQualifiedName~Units"
```

**Kết quả mong đợi**: Tất cả các test case đều vượt qua (100% Passed).

---

## 3. Kịch bản Xác minh Thủ công End-to-End (E2E Validation Scenarios)

### Kịch bản 1: Kiểm tra Danh sách & Khởi tạo Mẫu (Seed Data)
1. Truy cập `http://localhost:4200/units`.
2. **Quan sát**: Bảng `<app-shared-table>` hiển thị danh sách các đơn vị tính cơ bản do hệ thống khởi tạo (Kilogram, Gam, Lít, Mililit, Chai, Thùng, Lon, Gói, Quả, Đĩa...).
3. Kiểm tra các cột: Tên đơn vị, Ký hiệu viết tắt, Trạng thái (Huy hiệu xanh "Đang dùng"), Thao tác (Sửa, Xóa).
4. Thử tìm kiếm từ khóa `"kg"` trên thanh tìm kiếm -> Bảng lọc ra dòng Kilogram.

### Kịch bản 2: Tạo mới Đơn vị tính & Kiểm tra Cơ chế Fallback Viết tắt
1. Nhấn nút **"Thêm mới"** (màu cam nổi bật).
2. Modal `<app-shared-modal>` mở ra với phong cách Cam & Trắng.
3. **Trường hợp A (Có viết tắt)**: Nhập Tên `"Bao lớn"`, Viết tắt `"Bao"` -> Nhấn **Lưu**.
   - **Kết quả**: Modal đóng, toast thành công hiển thị, dòng mới xuất hiện với tên `"Bao lớn"` và viết tắt `"Bao"`.
4. **Trường hợp B (Bỏ trống viết tắt)**: Nhấn **"Thêm mới"**, nhập Tên `"Can"`, để trống ô Viết tắt -> Nhấn **Lưu**.
   - **Kết quả**: Hệ thống tự động gán viết tắt là `"Can"` (`Abbreviation = Name`).

### Kịch bản 3: Kiểm tra Chặn Trùng tên Đơn vị tính
1. Nhấn **"Thêm mới"**.
2. Nhập Tên `"  kilogram  "` (chữ thường kèm khoảng trắng) -> Nhấn **Lưu**.
3. **Kết quả**: Toast báo lỗi thân thiện hiển thị: *"Đơn vị tính 'Kilogram' đã tồn tại!"*, form không bị đóng và không lưu trùng.

### Kịch bản 4: Chỉnh sửa Đơn vị tính
1. Tại dòng `"Bao lớn"`, nhấn nút **"Sửa"**.
2. Đổi tên thành `"Bao cực đại"`, đổi trạng thái sang **Tạm ngưng** (`IsActive = false`) -> Nhấn **Lưu**.
3. **Kết quả**: Bảng cập nhật tên mới `"Bao cực đại"`, huy hiệu trạng thái chuyển sang màu xám/cảnh báo *"Tạm ngưng"*.

### Kịch bản 5: Kiểm tra Bảo vệ An toàn khi Xóa (Delete Protection)
1. **Trường hợp A (Xóa đơn vị mặc định hệ thống)**:
   - Tại dòng `"Kilogram"`, nhấn nút **"Xóa"** và xác nhận trên modal cảnh báo.
   - **Kết quả**: Toast thông báo lỗi *"Không thể xóa đơn vị tính mặc định của hệ thống!"*, bản ghi `"Kilogram"` vẫn tồn tại nguyên vẹn.
2. **Trường hợp B (Xóa đơn vị tự tạo chưa liên kết)**:
   - Tại dòng `"Can"` (vừa tạo ở Kịch bản 2), nhấn nút **"Xóa"** và xác nhận.
   - **Kết quả**: Xóa thành công, dòng `"Can"` biến mất khỏi bảng danh sách.

### Kịch bản 6: Kiểm tra Chuyển đổi Ngôn ngữ (I18N)
1. Chuyển đổi ngôn ngữ hệ thống từ **Tiếng Việt** sang **English**.
2. **Quan sát**: Tiêu đề trang, tên các cột bảng (*Unit Name, Abbreviation, Status, Actions*), nút bấm (*New Unit*), modal và toast đều chuyển đổi 100% sang Tiếng Anh chuẩn xác, không còn bất kỳ chữ Tiếng Việt nào hardcode.
