# Hướng dẫn Khởi động Nhanh & Kiểm thử E2E: RM-005

**Tính năng**: Quản lý Nguyên liệu (Ingredients) (RM-005)  
**Nhánh**: `005-rm-005-ingredients`  
**Ngày**: 2026-10-08  
**Đặc tả**: [spec.md](./spec.md) | **Kế hoạch**: [plan.md](./plan.md)

---

## 1. Yêu cầu Môi trường

1. **Backend Host**: Đang chạy tại `https://localhost:44320` (`Acme.TooHungry.HttpApi.Host`).
2. **Frontend Angular**: Đang chạy tại `http://localhost:4200`.
3. **Tài khoản kiểm thử**: Quản trị viên (`admin`) hoặc Quản lý nhà hàng có quyền `TooHungry.Ingredients.*`.

---

## 2. Kịch bản Kiểm thử End-to-End (E2E Test Scenarios)

### Kịch bản 1: Điều hướng & Hiển thị Giao diện Nguyên liệu

1. Truy cập `http://localhost:4200` và đăng nhập tài khoản có quyền.
2. Trên thanh menu sidebar bên trái, mở nhóm **Kho hàng** (`::Menu:InventoryGroup`).
3. Xác nhận có mục menu **Nguyên liệu** (`::Menu:Ingredients`) nằm trên mục Tồn kho.
4. Bấm vào mục **Nguyên liệu**, hệ thống điều hướng đến đường dẫn `/ingredients`.
5. **Kết quả mong đợi**:
   - Tiêu đề trang hiển thị chuẩn: "Quản lý Nguyên liệu" (hoặc "Ingredient Management").
   - Bảng dữ liệu hiển thị đúng chuẩn Orange & White Theme với các cột: Tên nguyên liệu, Đơn vị tính, Bảo quản, Tiêu hao, Tồn tối thiểu, Đơn giá tham khảo, Tồn kho hiện tại, Trạng thái, Thao tác.
   - Bộ lọc trạng thái trên thanh công cụ mặc định chọn "Đang hoạt động".

---

### Kịch bản 2: Thêm mới Nguyên liệu thành công

1. Nhấn nút **"Thêm mới nguyên liệu"** (màu cam nổi bật).
2. Modal form thêm mới mở ra. Điền các thông tin:
   - **Tên nguyên liệu**: `Thịt bò Úc Ribeye`
   - **Đơn vị tính**: Chọn `Kilogram` (từ dropdown Đơn vị tính của RM-004)
   - **Định mức tồn tối thiểu**: `5`
   - **Đơn giá tham khảo**: `350000`
   - **Loại bảo quản**: `Ngắn hạn (Tươi sống)`
   - **Phương thức tiêu hao**: `Theo công thức`
3. Nhấn **"Lưu"**.
4. **Kết quả mong đợi**:
   - Toast thông báo màu xanh "Thêm mới nguyên liệu thành công!".
   - Modal đóng lại.
   - Bản ghi "Thịt bò Úc Ribeye" xuất hiện ngay trên dòng đầu của bảng với Tồn kho hiện tại = `0`, huy hiệu cảnh báo "Hết hàng" (do `0 <= 5`).

---

### Kịch bản 3: Chặn trùng lặp tên & Gợi ý Khôi phục thông minh

1. Nhấn nút **"Thêm mới nguyên liệu"**.
2. Nhập tên trùng lặp: `  thịt bò úc ribeye  ` (có khoảng trắng thừa và viết thường).
3. Nhấn **"Lưu"**.
4. **Kết quả mong đợi**:
   - Hệ thống chặn lưu và hiển thị thông báo lỗi rõ ràng: *"Tên nguyên liệu đã tồn tại trong hệ thống!"*.
   - Modal không bị đóng, giữ nguyên dữ liệu nhập liệu.

---

### Kịch bản 4: Tạm ngưng hoạt động & Kích hoạt lại

1. Tại dòng nguyên liệu "Thịt bò Úc Ribeye", nhấn nút thao tác **"Tạm ngưng"**.
2. Modal xác nhận mở ra yêu cầu nhập lý do. Nhập: `Nhà cung cấp tạm hết hàng`.
3. Nhấn **"Xác nhận tạm ngưng"**.
4. **Kết quả mong đợi**:
   - Toast thông báo thành công.
   - Do bộ lọc mặc định là "Đang hoạt động", nguyên liệu vừa tạm ngưng sẽ tự động ẩn khỏi danh sách.
5. Chuyển bộ lọc trạng thái sang **"Đã tạm ngưng"**:
   - Dòng nguyên liệu "Thịt bò Úc Ribeye" hiển thị với huy hiệu màu xám/vàng "Tạm ngưng".
6. Nhấn nút **"Kích hoạt lại"** (hoặc Khôi phục thông minh):
   - Modal khôi phục mở ra, cho phép điều chỉnh lại định mức tồn tối thiểu mới (ví dụ: `8`).
   - Nhấn xác nhận. Nguyên liệu quay trở về trạng thái Đang hoạt động với `MinStock = 8`.

---

### Kịch bản 5: Chỉnh sửa & Kiểm tra Khóa trường Đơn vị tính khi có dữ liệu

1. Với nguyên liệu chưa từng phát sinh lô kho hoặc công thức:
   - Nhấn nút **"Sửa"**.
   - Kiểm tra: Trường Đơn vị tính vẫn cho phép chọn lại bình thường.
2. Với nguyên liệu đã có trong Công thức món ăn hoặc đã có Lô kho nhập hàng:
   - Nhấn nút **"Sửa"**.
   - **Kết quả mong đợi**: Trường Đơn vị tính bị **khóa (disabled / read-only)** kèm tooltip giải thích: *"Không thể đổi đơn vị tính do nguyên liệu đã phát sinh dữ liệu kho hoặc công thức. Vui lòng tạm ngưng và tạo mới nếu cần."*.

---

### Kịch bản 6: Xóa an toàn Nguyên liệu

1. **Thử xóa nguyên liệu đã có dữ liệu vận hành**:
   - Chọn nguyên liệu đang nằm trong công thức món ăn hoặc đã có lô hàng trong kho.
   - Nhấn nút **"Xóa"** và bấm xác nhận trên popup cảnh báo.
   - **Kết quả mong đợi**: Hệ thống từ chối xóa, ném thông báo lỗi thân thiện giải thích rõ lý do và hướng dẫn sử dụng chức năng Tạm ngưng.
2. **Xóa nguyên liệu rác mới tạo**:
   - Tạo một nguyên liệu thử nghiệm `Nguyên liệu test 123`.
   - Nhấn nút **"Xóa"** và bấm xác nhận.
   - **Kết quả mong đợi**: Xóa thành công, dòng nguyên liệu biến mất khỏi danh sách.

---

### Kịch bản 7: Kiểm tra Đa ngôn ngữ (I18N)

1. Ở góc trên bên phải màn hình, chuyển ngôn ngữ từ **Tiếng Việt** sang **English**.
2. **Kết quả mong đợi**: Toàn bộ tiêu đề cột, nhãn modal, placeholder, nút bấm và thông báo toast chuyển sang Tiếng Anh (không còn chữ Tiếng Việt hoặc key thô `::...`).
3. Chuyển ngược lại sang **Tiếng Việt**: Toàn bộ giao diện hiển thị đúng chuẩn Tiếng Việt tự nhiên.
