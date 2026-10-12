# Đặc tả Tính năng (Feature Specification): [TÊN TÍNH NĂNG]

**Nhánh Tính năng (Feature Branch)**: `[###-feature-name]`

**Ngày tạo**: [DATE]

**Trạng thái**: Bản nháp (Draft)

**Đầu vào**: Mô tả của người dùng: "$ARGUMENTS"

## Kịch bản Người dùng & Kiểm thử (User Scenarios & Testing) *(bắt buộc)*

<!--
  QUAN TRỌNG: User stories nên được ƯU TIÊN như là các hành trình của người dùng được sắp xếp theo tầm quan trọng.
  Mỗi user story/journey phải CÓ THỂ KIỂM THỬ ĐỘC LẬP - nghĩa là nếu bạn chỉ triển khai MỘT story,
  bạn vẫn sẽ có một MVP (Minimum Viable Product) mang lại giá trị.

  Gán các mức độ ưu tiên (P1, P2, P3, v.v.) cho mỗi story, trong đó P1 là quan trọng nhất.
  Hãy coi mỗi story như một phần chức năng độc lập có thể được:
  - Phát triển độc lập
  - Kiểm thử độc lập
  - Triển khai độc lập
  - Trình diễn cho người dùng độc lập
-->

### User Story 1 - [Tiêu đề ngắn] (Ưu tiên: P1)

[Mô tả hành trình người dùng này bằng ngôn ngữ tự nhiên]

**Lý do cho mức độ ưu tiên này**: [Giải thích giá trị và tại sao nó có mức độ ưu tiên này]

**Kiểm thử Độc lập**: [Mô tả cách thức có thể kiểm thử độc lập story này - ví dụ: "Có thể được kiểm thử hoàn toàn bằng [hành động cụ thể] và mang lại [giá trị cụ thể]"]

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** [trạng thái ban đầu], **Khi (When)** [hành động], **Thì (Then)** [kết quả mong đợi]
2. **Cho trước (Given)** [trạng thái ban đầu], **Khi (When)** [hành động], **Thì (Then)** [kết quả mong đợi]

---

### User Story 2 - [Tiêu đề ngắn] (Ưu tiên: P2)

[Mô tả hành trình người dùng này bằng ngôn ngữ tự nhiên]

**Lý do cho mức độ ưu tiên này**: [Giải thích giá trị và tại sao nó có mức độ ưu tiên này]

**Kiểm thử Độc lập**: [Mô tả cách thức có thể kiểm thử độc lập story này]

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** [trạng thái ban đầu], **Khi (When)** [hành động], **Thì (Then)** [kết quả mong đợi]

---

### User Story 3 - [Tiêu đề ngắn] (Ưu tiên: P3)

[Mô tả hành trình người dùng này bằng ngôn ngữ tự nhiên]

**Lý do cho mức độ ưu tiên này**: [Giải thích giá trị và tại sao nó có mức độ ưu tiên này]

**Kiểm thử Độc lập**: [Mô tả cách thức có thể kiểm thử độc lập story này]

**Kịch bản Chấp nhận (Acceptance Scenarios)**:

1. **Cho trước (Given)** [trạng thái ban đầu], **Khi (When)** [hành động], **Thì (Then)** [kết quả mong đợi]

---

[Thêm nhiều user stories hơn nếu cần, mỗi story có một mức độ ưu tiên được chỉ định]

### Các Trường hợp Ngoại lệ (Edge Cases)

<!--
  YÊU CẦU HÀNH ĐỘNG: Nội dung trong phần này là các chỗ dành sẵn (placeholders).
  Hãy điền chúng bằng các trường hợp ngoại lệ thích hợp.
-->

- Chuyện gì xảy ra khi [điều kiện biên]?
- Hệ thống xử lý thế nào khi [kịch bản lỗi]?

## Yêu cầu (Requirements) *(bắt buộc)*

<!--
  YÊU CẦU HÀNH ĐỘNG: Nội dung trong phần này là các chỗ dành sẵn (placeholders).
  Hãy điền chúng bằng các yêu cầu chức năng thích hợp.
-->

### Yêu cầu Chức năng (Functional Requirements)

- **FR-001**: Hệ thống PHẢI [khả năng cụ thể, ví dụ: "cho phép người dùng tạo tài khoản"]
- **FR-002**: Hệ thống PHẢI [khả năng cụ thể, ví dụ: "xác thực địa chỉ email"]
- **FR-003**: Người dùng PHẢI có khả năng [tương tác chính, ví dụ: "đặt lại mật khẩu của họ"]
- **FR-004**: Hệ thống PHẢI [yêu cầu dữ liệu, ví dụ: "lưu trữ tùy chọn của người dùng"]
- **FR-005**: Hệ thống PHẢI [hành vi, ví dụ: "ghi log tất cả các sự kiện bảo mật"]

*Ví dụ về việc đánh dấu các yêu cầu không rõ ràng:*

- **FR-006**: Hệ thống PHẢI xác thực người dùng thông qua [CẦN LÀM RÕ: phương thức xác thực không được chỉ định - email/password, SSO, OAuth?]
- **FR-007**: Hệ thống PHẢI giữ lại dữ liệu người dùng trong [CẦN LÀM RÕ: thời gian lưu trữ không được chỉ định]

### Các Thực thể Chính (Key Entities) *(bao gồm nếu tính năng liên quan đến dữ liệu)*

- **[Thực thể 1]**: [Nó đại diện cho điều gì, các thuộc tính chính mà không kèm theo chi tiết triển khai]
- **[Thực thể 2]**: [Nó đại diện cho điều gì, mối quan hệ với các thực thể khác]

## Tiêu chí Thành công (Success Criteria) *(bắt buộc)*

<!--
  YÊU CẦU HÀNH ĐỘNG: Định nghĩa các tiêu chí thành công có thể đo lường được.
  Những tiêu chí này phải độc lập với công nghệ và có thể đo lường.
-->

### Các Kết quả Có thể Đo lường (Measurable Outcomes)

- **SC-001**: [Chỉ số đo lường, ví dụ: "Người dùng có thể hoàn thành việc tạo tài khoản dưới 2 phút"]
- **SC-002**: [Chỉ số đo lường, ví dụ: "Hệ thống xử lý được 1000 người dùng đồng thời mà không bị giảm hiệu suất"]
- **SC-003**: [Chỉ số hài lòng của người dùng, ví dụ: "90% người dùng hoàn thành thành công tác vụ chính ngay lần thử đầu tiên"]
- **SC-004**: [Chỉ số kinh doanh, ví dụ: "Giảm 50% số lượng ticket hỗ trợ liên quan đến [X]"]

## Các Giả định (Assumptions)

<!--
  YÊU CẦU HÀNH ĐỘNG: Nội dung trong phần này là các chỗ dành sẵn (placeholders).
  Hãy điền chúng bằng các giả định dựa trên các mặc định hợp lý
  được chọn khi mô tả tính năng không chỉ định rõ các chi tiết cụ thể.
-->

- [Giả định về đối tượng người dùng, ví dụ: "Người dùng có kết nối internet ổn định"]
- [Giả định về giới hạn phạm vi, ví dụ: "Hỗ trợ thiết bị di động nằm ngoài phạm vi cho phiên bản 1"]
- [Giả định về dữ liệu/môi trường, ví dụ: "Hệ thống xác thực hiện tại sẽ được tái sử dụng"]
- [Phụ thuộc vào hệ thống/dịch vụ hiện có, ví dụ: "Yêu cầu quyền truy cập vào API hồ sơ người dùng hiện tại"]
