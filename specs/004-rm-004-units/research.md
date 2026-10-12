# Nghiên cứu Kỹ thuật (Technical Research): Quản lý Đơn vị tính (Units) (RM-004)

**Tính năng**: `004-rm-004-units`
**Ngày tạo**: 2026-10-08
**Trạng thái**: Hoàn thành (Complete)

---

## 1. Nghiên cứu & Quyết định Kiến trúc

### Quyết định 1: Cấu trúc phân lớp DDD & ABP Framework
- **Quyết định**: Tuân thủ nghiêm ngặt mô hình Domain-Driven Design (DDD) của ABP Framework 9.x+:
  - **Domain (`Acme.TooHungry.Domain/Units`)**: Thực thể `Unit` kế thừa `FullAuditedAggregateRoot<Guid>`, `UnitManager` xử lý các quy tắc bất biến (Invariants) như kiểm tra trùng tên không phân biệt hoa thường và kiểm tra điều kiện an toàn trước khi xóa (`CheckCanDeleteAsync`).
  - **Contracts (`Acme.TooHungry.Application.Contracts/Units`)**: Khai báo `IUnitAppService`, `UnitDto`, `CreateUpdateUnitDto` (đều có trường `IsActive`), và phân quyền `TooHungryPermissions.Units`.
  - **Application (`Acme.TooHungry.Application/Units`)**: `UnitAppService` điều phối use cases, ánh xạ AutoMapper, và bảo vệ endpoint bằng `[Authorize]`.
  - **EF Core (`Acme.TooHungry.EntityFrameworkCore`)**: Ánh xạ `DbSet<Unit> Units` với cấu hình ràng buộc max length và index tên.
- **Lý do**: Đảm bảo toàn vẹn dữ liệu, tách bạch rõ ràng giữa nghiệp vụ cốt lõi và điều phối API, tuân thủ Điều I trong Hiến pháp dự án.
- **Phương án khác đã xem xét**: Đặt logic kiểm tra trùng lặp tại Application Service -> Bị loại bỏ vì vi phạm nguyên tắc DDD của ABP (logic nghiệp vụ phải nằm trong Domain Service).

---

### Quyết định 2: Cơ chế Bảo vệ An toàn khi Xóa Đơn vị tính (Delete Invariants)
- **Quyết định**: `UnitManager.CheckCanDeleteAsync(Guid id)` phải thực hiện 2 cổng kiểm tra độc lập:
  1. **Cổng 1 (Đơn vị tính Hệ thống mặc định)**: Kiểm tra danh sách các đơn vị tính cơ bản do hệ thống khởi tạo (Kilogram, Gam, Lít, Mililit, Chai, Thùng, Lon, Gói, Quả, Đĩa). Nếu đơn vị thuộc danh mục này, ném `UserFriendlyException` từ chối xóa để tránh làm gãy cấu trúc đo lường toàn hệ thống.
  2. **Cổng 2 (Đơn vị tính đang được sử dụng)**: Kiểm tra xem `UnitId` có đang được tham chiếu bởi bất kỳ bản ghi `Ingredient` nào làm `PurchaseUnitId` hoặc `UsageUnitId` hay không. Nếu có, ném `UserFriendlyException` yêu cầu người dùng thay đổi hoặc gỡ liên kết nguyên liệu trước khi xóa.
- **Lý do**: Bảo vệ toàn vẹn dữ liệu chuỗi vận hành (Nguyên liệu, Công thức, Tồn kho, Mua hàng).
- **Phương án khác đã xem xét**: Sử dụng Cascade Delete -> Bị từ chối triệt để vì sẽ làm mất dữ liệu nguyên liệu hoặc gây lỗi null reference trong kho.

---

### Quyết định 3: Tự động Fallback cho Ký hiệu Viết tắt (`Abbreviation`)
- **Quyết định**: Trường `Abbreviation` trong DTO là tùy chọn (nullable). Tuy nhiên, tại `UnitManager.CreateAsync` và `UpdateAsync`, nếu người dùng không nhập hoặc chỉ nhập khoảng trắng, hệ thống sẽ tự động gán `Abbreviation = cleanName` (`Name.Trim()`).
- **Lý do**: Các phân hệ hạ nguồn như Quản lý Tồn kho (RM-012, RM-013) và Định lượng Món ăn (RM-007) luôn cần chuỗi viết tắt để hiển thị ngắn gọn trên bảng số lượng (ví dụ: `150 kg`, `20 Bao`). Việc tự động fallback ngăn chặn hoàn toàn lỗi hiển thị chuỗi rỗng trên UI.

---

### Quyết định 4: Độc lập Tỷ lệ Quy đổi giữa Unit và Ingredient
- **Quyết định**: `Unit` là một danh mục phẳng thuần túy (Flat list). Không lưu trữ các tỷ lệ quy đổi lồng nhau phức tạp trong bảng `Units`. Toàn bộ tỷ lệ quy đổi (ví dụ: 1 Thùng = 24 Lon hay 1 Thùng = 12 Hộp) được quản lý theo từng Nguyên liệu (`Ingredient.ConversionFactor` thuộc RM-005).
- **Lý do**: Trong thực tế nhà hàng, cùng một đơn vị tính "Thùng" nhưng thùng bia có 24 lon, còn thùng dầu ăn có 6 can 5L. Do đó quy đổi quy cách chỉ có ý nghĩa khi gắn liền với từng nguyên liệu cụ thể.

---

### Quyết định 5: Hiện đại hóa Giao diện Angular với Shared UI (RM-002) & Cam - Trắng Theme
- **Quyết định**: Tái cấu trúc màn hình `unit.component` sang sử dụng 100% Shared UI từ RM-002:
  - Bảng danh sách: `<app-shared-table>` với phân trang, tìm kiếm, cột hành động, huy hiệu trạng thái `IsActive` (Active: xanh lá/cam, Inactive: xám nhạt).
  - Modal tạo/sửa: `<app-shared-modal>` chứa form nhập liệu tinh gọn, validation realtime, tự động trim và autofocus.
  - Bộ lọc & phân trang: `<app-custom-select>` theo phong cách **Cam & Trắng** (Orange & White Theme) theo Hiến pháp Điều VI.
- **Lý do**: Đồng bộ trải nghiệm người dùng toàn hệ thống, loại bỏ sự thô cứng và không nhất quán của bảng datatable mặc định.

---

### Quyết định 6: Quốc tế hóa (I18N) Toàn diện
- **Quyết định**: Định nghĩa đầy đủ key song ngữ trong cả [`vi.json`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/vi.json) và [`en.json`](file:///d:/DFT/Acme.TooHungry/src/Acme.TooHungry.Domain.Shared/Localization/TooHungry/en.json) cho toàn bộ tiêu đề, cột bảng, nhãn form, nút bấm, thông báo toast và các thông điệp lỗi nghiệp vụ (`UserFriendlyException`).
- **Lý do**: Tuân thủ Điều VII trong Hiến pháp Acme.TooHungry và quy tắc cốt lõi của dự án.
