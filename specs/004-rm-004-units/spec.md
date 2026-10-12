# Đặc tả Tính năng (Feature Specification): Quản lý Đơn vị tính (Units) (RM-004)

**Nhánh Tính năng (Feature Branch)**: `004-rm-004-units`

**Ngày tạo**: 2026-10-08

**Trạng thái**: Đã làm rõ (Clarified)

**Đầu vào**: Mô tả từ roadmap: "Quản lý danh sách đơn vị tính sử dụng cho nguyên liệu (kg, lit, gói, hộp...). Thực thể: Unit — list, tạo, sửa, xoá. Phụ thuộc: RM-002."

---

## Làm rõ Yêu cầu (Clarifications)

### Phiên 08-10-2026 (Lần 1 - Khởi tạo đặc tả RM-004)
- **Q1: Ràng buộc trùng lặp tên và ký hiệu viết tắt**: Hệ thống kiểm tra trùng lặp như thế nào?
  → **A1**: Tên đơn vị (`Name`) là duy nhất trong toàn hệ thống (không phân biệt chữ hoa/thường, tự động loại bỏ khoảng trắng thừa ở hai đầu). Ký hiệu viết tắt (`Abbreviation`) cũng phải là duy nhất nếu được nhập để tránh gây nhầm lẫn khi hiển thị trên giao diện kho và công thức.
- **Q2: Ràng buộc xóa đơn vị tính (Delete Constraint)**: Khi một đơn vị tính đang được sử dụng bởi ít nhất một nguyên liệu (`Ingredient`) làm đơn vị mua (`PurchaseUnit`) hoặc đơn vị sử dụng (`UsageUnit`), hệ thống xử lý ra sao khi người dùng yêu cầu xóa?
  → **A2**: Hệ thống BẮT BUỘC chặn xóa (không cho phép xóa), hiển thị thông báo lỗi thân thiện rõ ràng (UserFriendlyException) yêu cầu người dùng thay đổi hoặc gỡ liên kết nguyên liệu trước khi xóa.
- **Q3: Trạng thái Hoạt động (`IsActive`)**: Có cho phép bật/tắt trạng thái hoạt động của Đơn vị tính không?
  → **A3**: Có. Thuộc tính `IsActive` (mặc định `true`) cho phép người dùng tạm ngừng kích hoạt đơn vị tính khi không còn sử dụng. Khi bị vô hiệu hóa (`IsActive = false`), đơn vị tính này sẽ không xuất hiện trong các dropdown chọn đơn vị tính của màn hình Nguyên liệu mới, nhưng dữ liệu lịch sử và các nguyên liệu cũ vẫn bảo toàn.
- **Q4: Dữ liệu khởi tạo mặc định (Data Seeding)**: Cần seed những đơn vị tính nào khi khởi tạo hệ thống?
  → **A4**: Tự động seed sẵn các đơn vị phổ biến trong nhà hàng: Kilogram (Kg), Gam (g), Lít (L), Mililit (ml), Chai (Chai), Thùng (Thùng), Lon (Lon), Gói (Gói), Quả (Quả), Đĩa (Đĩa).

### Phiên 08-10-2026 (Lần 2 - `/speckit.clarify`)
- **Q5: Kiến trúc quy đổi đơn vị (Unit Conversion)**: Hệ thống có quản lý tỷ lệ quy đổi chuẩn trực tiếp trong thực thể Đơn vị tính (`Unit`) không, hay tỷ lệ quy đổi chỉ được định nghĩa theo từng Nguyên liệu (`Ingredient`)?
  → **A5**: Quy đổi theo từng Nguyên liệu (`Ingredient`). `Unit` là danh mục phẳng thuần túy (Tên, Viết tắt, Trạng thái). Tỷ lệ quy đổi (ví dụ: 1 Thùng = 24 Lon hay 1 Thùng = 12 Hộp) được cấu hình tại từng Nguyên liệu (`Ingredient.ConversionFactor`) như đặc tả RM-005.
- **Q6: Bảo vệ các đơn vị tính mặc định cốt lõi**: Hệ thống có cần cơ chế bảo vệ đặc biệt (như chặn xóa hoặc khóa) đối với các đơn vị tính mặc định cốt lõi (Kg, Gam, Lít, Mililit...) hay không?
  → **A6**: Có bảo vệ. Hệ thống BẮT BUỘC chặn xóa đối với các đơn vị tính mặc định cốt lõi do hệ thống seed sẵn để tránh phá vỡ tính toàn vẹn dữ liệu chuỗi đo lường của nhà hàng. Khi người dùng cố gắng xóa, hệ thống hiển thị thông báo lỗi thân thiện từ chối hành động.
- **Q7: Ràng buộc trường viết tắt (`Abbreviation`)**: Khi tạo mới hoặc sửa Đơn vị tính, trường ký hiệu viết tắt (`Abbreviation`) nên được ràng buộc như thế nào nếu người dùng để trống?
  → **A7**: Tự động fallback. Cho phép người dùng bỏ trống trường viết tắt khi nhập liệu; nếu bỏ trống, hệ thống tự động gán `Abbreviation = Name` để bảo đảm luôn có chuỗi hiển thị ngắn gọn cho các phân hệ Tồn kho (RM-012/013) và Công thức (RM-007).

---

## 1. Tóm tắt & Bối cảnh Nghiệp vụ (Summary & Business Context)

Tính năng **Quản lý Đơn vị tính (Units) (RM-004)** thuộc phân hệ Dữ liệu danh mục nền tảng (Master Data, Wave 1). Đây là thành phần dữ liệu cốt lõi phục vụ cho toàn bộ quy trình quản lý nguyên liệu (RM-005), công thức định lượng món ăn (RM-007), quản lý tồn kho và giao dịch nhập/xuất kho (RM-012, RM-013, RM-014).

Màn hình Quản lý Đơn vị tính cho phép Quản lý nhà hàng hoặc Quản trị viên:
1. Xem danh sách toàn bộ đơn vị tính trong hệ thống kèm thông tin ký hiệu viết tắt, trạng thái kích hoạt, thời gian tạo/cập nhật.
2. Tìm kiếm và sắp xếp danh sách theo tên đơn vị hoặc ký hiệu viết tắt.
3. Thêm mới đơn vị tính với kiểm tra trùng lặp tự động và cơ chế tự động fallback ký hiệu viết tắt.
4. Chỉnh sửa thông tin đơn vị tính (tên, viết tắt, trạng thái hoạt động).
5. Xóa đơn vị tính an toàn có kiểm tra toàn vẹn dữ liệu (chặn xóa nếu là đơn vị hệ thống mặc định hoặc đang được sử dụng trong Nguyên liệu).

**Giao diện (Frontend)**: Xây dựng màn hình trên Angular sử dụng 100% Shared UI từ RM-002 (`shared-table`, `shared-modal`, `custom-select`, bộ nhận diện thương hiệu Cam & Trắng - Orange & White Theme theo Hiến pháp Acme.TooHungry).

**Backend**: Tận dụng và hoàn thiện tầng Domain & Application có sẵn (`Unit`, `UnitManager`, `UnitAppService`, `IUnitAppService`, `UnitDto`, `CreateUpdateUnitDto`, AutoMapper profile, Permission checks).

---

## 2. Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing)

### User Story 1 - Xem danh sách Đơn vị tính (Ưu tiên: P1)

Là một Quản lý nhà hàng hoặc Quản trị viên, tôi muốn xem danh sách các đơn vị tính hiện có trong hệ thống kèm theo ký hiệu viết tắt và trạng thái để nắm rõ các chuẩn đo lường đang được áp dụng.

**Lý do ưu tiên**: Đây là màn hình cơ sở đầu tiên giúp người dùng tra cứu và quản lý dữ liệu đo lường của nhà hàng.

**Kiểm thử Độc lập**: Truy cập màn hình `/units`, hệ thống hiển thị bảng danh sách đầy đủ với dữ liệu phân trang và tìm kiếm.

**Kịch bản Chấp nhận**:
1. **Cho trước** người dùng đã đăng nhập với vai trò có quyền xem đơn vị tính (`TooHungryPermissions.Units.Default`), **Khi** truy cập trang `/units`, **Thì** hệ thống hiển thị bảng danh sách đơn vị tính gồm các cột: Tên đơn vị, Viết tắt, Trạng thái (Đang dùng / Tạm ngưng), Thao tác (Sửa, Xóa).
2. **Cho trước** danh sách có nhiều hơn 10 bản ghi, **Khi** người dùng chọn đổi số dòng trên trang (5, 10, 20) hoặc chuyển trang, **Thì** bảng dữ liệu cập nhật tương ứng theo phân trang.
3. **Cho trước** danh sách đơn vị tính, **Khi** người dùng nhập từ khóa tìm kiếm (ví dụ: "kg" hoặc "lít"), **Thì** danh sách tự động lọc ra các đơn vị có tên hoặc viết tắt khớp với từ khóa.

---

### User Story 2 - Thêm mới Đơn vị tính (Ưu tiên: P1)

Là một Quản lý nhà hàng, tôi muốn thêm một đơn vị tính mới (ví dụ: "Hộp", "Bao") khi nhà hàng nhập thêm loại nguyên liệu với quy cách đóng gói mới.

**Lý do ưu tiên**: Đảm bảo nghiệp vụ linh hoạt, có thể mở rộng danh mục đơn vị tính bất cứ lúc nào khi phát sinh thực tế.

**Kiểm thử Độc lập**: Nhấn nút "Thêm mới", điền thông tin và xác nhận, đơn vị tính mới xuất hiện ngay lập tức trên bảng danh sách.

**Kịch bản Chấp nhận**:
1. **Cho trước** người dùng ở màn hình danh sách đơn vị tính, **Khi** nhấn nút "Thêm mới", **Thì** hệ thống mở modal form thêm mới đơn vị tính với các trường: Tên đơn vị (bắt buộc), Ký hiệu viết tắt, Trạng thái hoạt động (mặc định Bật).
2. **Cho trước** form thêm mới, **Khi** người dùng nhập Tên đơn vị chưa tồn tại (ví dụ: "Hộp") và Viết tắt ("hop"), sau đó nhấn "Lưu", **Thì** hệ thống lưu thành công, đóng modal, hiển thị thông báo thành công và cập nhật lại danh sách.
3. **Cho trước** form thêm mới, **Khi** người dùng nhập Tên đơn vị ("Bao") nhưng bỏ trống trường Viết tắt và nhấn "Lưu", **Thì** hệ thống tự động gán Viết tắt là "Bao" (`Abbreviation = Name`), lưu thành công và hiển thị trên bảng.
4. **Cho trước** form thêm mới, **Khi** người dùng nhập Tên đơn vị đã tồn tại trong hệ thống (ví dụ: "Kilogram"), **Thì** hệ thống hiển thị thông báo lỗi "Đơn vị tính 'Kilogram' đã tồn tại!" và không cho phép lưu trùng.

---

### User Story 3 - Cập nhật Đơn vị tính (Ưu tiên: P1)

Là một Quản lý nhà hàng, tôi muốn chỉnh sửa tên hoặc ký hiệu viết tắt của một đơn vị tính khi có sự thay đổi hoặc sửa lỗi chính tả.

**Lý do ưu tiên**: Cho phép chuẩn hóa lại dữ liệu nhập liệu mà không cần phải xóa đi tạo lại.

**Kiểm thử Độc lập**: Nhấn nút Sửa ở một dòng đơn vị tính, thay đổi thông tin và Lưu, dữ liệu dòng đó trên bảng được cập nhật mới.

**Kịch bản Chấp nhận**:
1. **Cho trước** một đơn vị tính trên danh sách, **Khi** người dùng nhấn nút "Sửa", **Thì** modal mở ra và điền sẵn thông tin hiện tại của đơn vị tính đó.
2. **Cho trước** form chỉnh sửa, **Khi** người dùng sửa ký hiệu viết tắt từ "Kg" thành "kg" và nhấn "Lưu", **Thì** hệ thống cập nhật thành công và đóng modal.
3. **Cho trước** form chỉnh sửa, **Khi** người dùng xóa trống trường Viết tắt và nhấn "Lưu", **Thì** hệ thống tự động fallback gán `Abbreviation` bằng `Name` và lưu thành công.
4. **Cho trước** form chỉnh sửa, **Khi** người dùng đổi tên đơn vị tính thành một tên đã trùng với một đơn vị khác trong hệ thống, **Thì** hệ thống báo lỗi trùng lặp và chặn lưu.

---

### User Story 4 - Xóa Đơn vị tính an toàn (Ưu tiên: P2)

Là một Quản lý nhà hàng, tôi muốn xóa những đơn vị tính được tạo nhầm hoặc không còn sử dụng để giữ cho danh mục luôn gọn gàng.

**Lý do ưu tiên**: Dọn dẹp dữ liệu rác nhưng phải đảm bảo an toàn tuyệt đối, không gây đứt gãy dữ liệu của các phân hệ liên quan (Nguyên liệu, Kho, Bếp).

**Kiểm thử Độc lập**: Thử xóa một đơn vị tính chưa gắn nguyên liệu (thành công), một đơn vị tính đã gắn vào nguyên liệu (bị chặn), và một đơn vị tính hệ thống mặc định (bị chặn).

**Kịch bản Chấp nhận**:
1. **Cho trước** một đơn vị tính tự tạo chưa từng được liên kết với nguyên liệu nào, **Khi** người dùng nhấn nút "Xóa" và xác nhận trên modal cảnh báo, **Thì** hệ thống thực hiện xóa (Soft Delete) và loại bỏ dòng đó khỏi danh sách.
2. **Cho trước** một đơn vị tính đang được sử dụng bởi nguyên liệu (làm `PurchaseUnitId` hoặc `UsageUnitId`), **Khi** người dùng nhấn "Xóa" và xác nhận, **Thì** hệ thống từ chối xóa, hiển thị thông báo lỗi rõ ràng giải thích rằng đơn vị tính đang được sử dụng bởi nguyên liệu trong hệ thống.
3. **Cho trước** một đơn vị tính mặc định của hệ thống (ví dụ: "Kilogram", "Lít", "Chai"), **Khi** người dùng nhấn "Xóa", **Thì** hệ thống hiển thị thông báo từ chối "Không thể xóa đơn vị tính mặc định của hệ thống" và chặn thao tác xóa.

---

### User Story 5 - Đổi trạng thái Kích hoạt (Ưu tiên: P2)

Là một Quản lý nhà hàng, tôi muốn tạm ngừng kích hoạt một đơn vị tính để nó không xuất hiện trong danh sách lựa chọn khi thêm mới nguyên liệu, mà không cần phải xóa nó.

**Lý do ưu tiên**: Quản lý vòng đời dữ liệu mềm dẻo, ngăn việc chọn nhầm đơn vị tính lỗi thời.

**Kiểm thử Độc lập**: Tắt kích hoạt một đơn vị tính, kiểm tra trạng thái trên bảng và trong dropdown chọn đơn vị của màn hình Nguyên liệu.

**Kịch bản Chấp nhận**:
1. **Cho trước** một đơn vị tính đang Hoạt động (`IsActive = true`), **Khi** người dùng chỉnh sửa trạng thái sang Tạm ngưng (`IsActive = false`) và lưu, **Thì** trạng thái trên bảng chuyển sang huy hiệu màu xám/cảnh báo "Tạm ngưng".

---

## 3. Các Trường hợp Ngoại lệ (Edge Cases)

1. **Tên đơn vị chứa khoảng trắng thừa**: Người dùng nhập `"  Kilogram  "`, hệ thống tự động loại bỏ khoảng trắng thừa (`Trim()`) thành `"Kilogram"` trước khi kiểm tra trùng lặp và lưu trữ.
2. **Chữ hoa và chữ thường**: `"kilogram"`, `"Kilogram"`, `"KILOGRAM"` được coi là trùng lặp. Hệ thống so sánh không phân biệt chữ hoa/thường (`ToLower()`).
3. **Bỏ trống trường Viết tắt**: Nếu người dùng không nhập hoặc chỉ nhập khoảng trắng vào ô Ký hiệu viết tắt, hệ thống tự động gán `Abbreviation = Name.Trim()`.
4. **Xóa đơn vị tính mặc định hệ thống**: Hệ thống từ chối xóa và hiển thị thông báo lỗi thân thiện để bảo vệ dữ liệu toàn chuỗi.
5. **Mất kết nối mạng hoặc lỗi server**: Giao diện hiển thị toast notification thông báo lỗi thân thiện, không làm sập giao diện (không white-screen).

---

## 4. Yêu cầu (Requirements)

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI cung cấp giao diện quản lý danh sách Đơn vị tính dưới dạng bảng dữ liệu (`shared-table`), hỗ trợ phân trang, tìm kiếm theo tên/viết tắt, và sắp xếp theo tên (A-Z, Z-A).
- **FR-002**: Hệ thống PHẢI cho phép Thêm mới đơn vị tính với các trường:
  - Tên đơn vị (`Name`): Bắt buộc, độ dài tối đa 64 ký tự, duy nhất trong hệ thống.
  - Viết tắt (`Abbreviation`): Không bắt buộc, độ dài tối đa 16 ký tự. Nếu người dùng để trống, hệ thống PHẢI tự động gán giá trị bằng `Name`.
  - Trạng thái hoạt động (`IsActive`): Kiểu boolean, mặc định là `true`.
- **FR-003**: Hệ thống PHẢI cho phép Chỉnh sửa thông tin đơn vị tính hiện có (Tên, Viết tắt, Trạng thái hoạt động) thông qua modal form (`shared-modal`). Nếu người dùng xóa trống Viết tắt, hệ thống PHẢI tự động fallback gán bằng `Name`.
- **FR-004**: Hệ thống PHẢI kiểm tra tính duy nhất của Tên đơn vị tính (không phân biệt chữ hoa/thường) khi Tạo mới và khi Cập nhật. Nếu trùng, PHẢI ném ngoại lệ thân thiện `UserFriendlyException`.
- **FR-005**: Hệ thống PHẢI kiểm tra ràng buộc trước khi Xóa đơn vị tính:
  - Nếu đơn vị tính là đơn vị mặc định cốt lõi của hệ thống (thuộc danh mục Seeder), hệ thống PHẢI chặn thao tác xóa và ném `UserFriendlyException`.
  - Nếu đơn vị tính đang được tham chiếu bởi bất kỳ bản ghi `Ingredient` nào (làm `PurchaseUnitId` hoặc `UsageUnitId`), hệ thống PHẢI chặn thao tác xóa và ném `UserFriendlyException` thông báo rõ lý do.
- **FR-006**: Hệ thống PHẢI tự động khởi tạo dữ liệu mẫu (Data Seeder) cho các đơn vị tính cơ bản khi thiết lập cơ sở dữ liệu (Kilogram, Gam, Lít, Mililit, Chai, Thùng, Lon, Gói, Quả, Đĩa).
- **FR-007**: Hệ thống PHẢI cấu hình phân quyền ABP Permissions cho module Units bao gồm:
  - `TooHungryPermissions.Units.Default` (Quyền xem danh sách)
  - `TooHungryPermissions.Units.Create` (Quyền tạo mới)
  - `TooHungryPermissions.Units.Edit` (Quyền chỉnh sửa)
  - `TooHungryPermissions.Units.Delete` (Quyền xóa)
- **FR-008**: Toàn bộ giao diện PHẢI hỗ trợ đa ngôn ngữ (I18N), cập nhật đầy đủ và đồng bộ 100% trong `vi.json` và `en.json`.
- **FR-009**: Giao diện PHẢI tuân thủ triệt để Hiến pháp Acme.TooHungry (Bộ nhận diện Cam & Trắng - Orange & White Theme, Shared Components từ RM-002, bo tròn góc, shadow tinh tế, micro-interactions mượt mà).
- **FR-010**: Thực thể `Unit` là danh mục phẳng thuần túy; toàn bộ logic và tỷ lệ quy đổi (ví dụ: 1 Thùng = 24 Lon) BẮT BUỘC phải được quản lý theo từng Nguyên liệu cụ thể (`Ingredient.ConversionFactor` thuộc RM-005), không quản lý quy đổi phức tạp trong bảng `Units`.

### Yêu cầu Phi chức năng & Kiến trúc (Non-Functional Requirements)

- **NFR-001 (Kiến trúc DDD)**: Tuân thủ cấu trúc phân lớp ABP Framework: Thực thể và nghiệp vụ kiểm tra tính hợp lệ/ràng buộc nằm tại `Domain` (`Unit`, `UnitManager`), điều phối dịch vụ và DTO tại `Application` (`UnitAppService`, `UnitDto`), hợp đồng tại `Application.Contracts` (`IUnitAppService`).
- **NFR-002 (Bảo mật & Kiểm toán)**: Thực thể `Unit` kế thừa `FullAuditedAggregateRoot<Guid>`, tự động ghi nhận người tạo, thời gian tạo, người sửa, thời gian sửa và hỗ trợ Soft Delete (`IsDeleted`).
- **NFR-003 (Hiệu năng)**: Thời gian phản hồi API truy vấn danh sách đơn vị tính dưới 200ms với tập dữ liệu thông thường; giao diện tải dữ liệu mượt mà, không giật lag.

### Các Thực thể Chính (Key Entities)

- **Unit**:
  - `Id`: `Guid` (Khóa chính).
  - `Name`: `string` (Tên đầy đủ của đơn vị tính, ví dụ: "Kilogram", "Lít").
  - `Abbreviation`: `string` (Ký hiệu viết tắt hiển thị nhanh, ví dụ: "kg", "L").
  - `IsActive`: `bool` (Cờ trạng thái hoạt động).
  - `CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `IsDeleted`, `DeletionTime`, `DeleterId` (Kế thừa từ `FullAuditedAggregateRoot`).

---

## 5. Tiêu chí Thành công (Success Criteria)

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: 100% các đơn vị tính cơ bản (ít nhất 6 đơn vị: Kilogram, Gam, Lít, Mililit, Chai, Thùng) được khởi tạo tự động trong DB khi chạy ứng dụng.
- **SC-002**: Người dùng có quyền có thể xem, tìm kiếm, lọc danh sách và thực hiện Thêm mới / Chỉnh sửa một đơn vị tính hoàn tất trong dưới 30 giây.
- **SC-003**: 100% các trường hợp nhập trùng tên đơn vị tính đều bị chặn với thông báo lỗi rõ ràng bằng đúng ngôn ngữ người dùng đang chọn (Tiếng Việt hoặc Tiếng Anh).
- **SC-004**: 100% các trường hợp cố ý xóa một đơn vị tính hệ thống mặc định hoặc đơn vị đang gán cho nguyên liệu đều bị chặn thành công, bảo vệ tính toàn vẹn dữ liệu kho.
- **SC-005**: 100% các đơn vị tính tạo mới mà người dùng bỏ trống ô Viết tắt đều tự động có `Abbreviation` bằng `Name`.
- **SC-006**: Mọi văn bản trên giao diện đều chuyển đổi chính xác khi người dùng đổi ngôn ngữ giữa Tiếng Việt và Tiếng Anh (không còn text hardcode).
- **SC-007**: Giao diện sử dụng 100% Shared UI từ RM-002 với phong cách Cam & Trắng đồng nhất toàn hệ thống.

---

## 6. Các Giả định (Assumptions)

- **Hệ thống Shared UI (RM-002)**: Đã hoàn thiện và cung cấp sẵn các component chuẩn (`SharedTableComponent`, `SharedModalComponent`, `CustomSelectComponent`, Toast notifications).
- **Quản lý Quyền (RM-003)**: Các quyền của Units (`TooHungryPermissions.Units`) đã được cấu hình trong `PermissionDefinitionProvider` và có thể cấp phát cho các vai trò như `Administrator`, `Manager`, `InventoryStaff`.
- **Nguyên liệu (RM-005)**: Thực thể `Ingredient` sẽ liên kết khóa ngoại tới `Unit` qua hai trường `PurchaseUnitId` và `UsageUnitId`, đồng thời quản lý `ConversionFactor` (1 PurchaseUnit = n UsageUnit). Kiểm tra ràng buộc xóa sẽ xác minh trên bảng Nguyên liệu này.
