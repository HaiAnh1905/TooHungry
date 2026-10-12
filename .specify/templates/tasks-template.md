---
description: "Mẫu danh sách tác vụ (Task list) để triển khai tính năng"
---

# Tác vụ (Tasks): [TÊN TÍNH NĂNG]

**Đầu vào (Input)**: Tài liệu thiết kế từ `/specs/[###-feature-name]/`

**Điều kiện tiên quyết (Prerequisites)**: plan.md (bắt buộc), spec.md (bắt buộc cho các user stories), research.md, data-model.md, contracts/

**Kiểm thử (Tests)**: Các ví dụ dưới đây bao gồm các tác vụ kiểm thử. Việc kiểm thử là TÙY CHỌN - chỉ bao gồm chúng nếu được yêu cầu rõ ràng trong đặc tả tính năng.

**Tổ chức**: Các tác vụ được nhóm theo user story để cho phép triển khai và kiểm thử độc lập cho từng story.

## Định dạng: `[ID] [P?] [Story] Mô tả`

- **[P]**: Có thể chạy song song (các file khác nhau, không có sự phụ thuộc)
- **[Story]**: Tác vụ này thuộc về user story nào (ví dụ: US1, US2, US3)
- Bao gồm đường dẫn file chính xác trong mô tả

## Quy ước Đường dẫn (Path Conventions)

- **Single project**: `src/`, `tests/` tại thư mục gốc repository
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` hoặc `android/src/`
- Đường dẫn được hiển thị bên dưới giả định là dự án đơn (single project) - hãy điều chỉnh dựa trên cấu trúc trong plan.md

<!--
  ============================================================================
  QUAN TRỌNG: Các tác vụ dưới đây CHỈ LÀ TÁC VỤ MẪU nhằm mục đích minh họa.

  Lệnh /speckit.tasks BẮT BUỘC PHẢI thay thế chúng bằng các tác vụ thực tế dựa trên:
  - Các user stories từ spec.md (cùng với mức độ ưu tiên của chúng P1, P2, P3...)
  - Các yêu cầu tính năng từ plan.md
  - Các thực thể từ data-model.md
  - Các endpoints từ contracts/

  Các tác vụ BẮT BUỘC PHẢI được tổ chức theo user story để mỗi story có thể:
  - Được triển khai độc lập
  - Được kiểm thử độc lập
  - Được chuyển giao như một khối tăng trưởng MVP

  KHÔNG ĐƯỢC giữ lại các tác vụ mẫu này trong file tasks.md được tạo ra.
  ============================================================================
-->

## Phase 1: Thiết lập (Cơ sở hạ tầng dùng chung)

**Mục đích**: Khởi tạo dự án và cấu trúc cơ bản

- [ ] T001 Tạo cấu trúc dự án theo kế hoạch triển khai
- [ ] T002 Khởi tạo dự án [ngôn ngữ] với các dependencies [framework]
- [ ] T003 [P] Cấu hình các công cụ linting và định dạng (formatting)

---

## Phase 2: Nền tảng (Các Điều kiện tiên quyết có tính chất Chặn - Blocking Prerequisites)

**Mục đích**: Cơ sở hạ tầng cốt lõi BẮT BUỘC phải hoàn thành trước khi BẤT KỲ user story nào có thể được triển khai

**⚠️ ĐẶC BIỆT QUAN TRỌNG**: Không một công việc user story nào có thể bắt đầu cho đến khi phase này hoàn thành

Các ví dụ về tác vụ nền tảng (điều chỉnh dựa trên dự án của bạn):

- [ ] T004 Thiết lập lược đồ cơ sở dữ liệu và framework migrations
- [ ] T005 [P] Triển khai framework xác thực/phân quyền (authentication/authorization)
- [ ] T006 [P] Thiết lập cấu trúc API routing và middleware
- [ ] T007 Tạo các models/entities cơ sở mà tất cả các stories phụ thuộc vào
- [ ] T008 Cấu hình hạ tầng xử lý lỗi và ghi log (logging)
- [ ] T009 Thiết lập quản lý cấu hình môi trường

**Trạm kiểm tra (Checkpoint)**: Nền tảng đã sẵn sàng - việc triển khai user story giờ đây có thể bắt đầu song song

---

## Phase 3: User Story 1 - [Tiêu đề] (Ưu tiên: P1) 🎯 MVP

**Mục tiêu**: [Mô tả ngắn gọn những gì story này mang lại]

**Kiểm thử Độc lập**: [Cách xác minh story này hoạt động riêng lẻ]

### Kiểm thử cho User Story 1 (TÙY CHỌN - chỉ khi có yêu cầu kiểm thử) ⚠️

> **LƯU Ý: Viết các bài kiểm thử này ĐẦU TIÊN, đảm bảo chúng THẤT BẠI (FAIL) trước khi triển khai**

- [ ] T010 [P] [US1] Kiểm thử hợp đồng (Contract test) cho [endpoint] trong tests/contract/test_[name].py
- [ ] T011 [P] [US1] Kiểm thử tích hợp (Integration test) cho [hành trình người dùng] trong tests/integration/test_[name].py

### Triển khai cho User Story 1

- [ ] T012 [P] [US1] Tạo model [Entity1] trong src/models/[entity1].py
- [ ] T013 [P] [US1] Tạo model [Entity2] trong src/models/[entity2].py
- [ ] T014 [US1] Triển khai [Service] trong src/services/[service].py (phụ thuộc vào T012, T013)
- [ ] T015 [US1] Triển khai [endpoint/feature] trong src/[location]/[file].py
- [ ] T016 [US1] Thêm xác thực dữ liệu (validation) và xử lý lỗi
- [ ] T017 [US1] Thêm logging cho các thao tác của user story 1

**Trạm kiểm tra (Checkpoint)**: Tại thời điểm này, User Story 1 phải có đầy đủ chức năng và có thể kiểm thử độc lập

---

## Phase 4: User Story 2 - [Tiêu đề] (Ưu tiên: P2)

**Mục tiêu**: [Mô tả ngắn gọn những gì story này mang lại]

**Kiểm thử Độc lập**: [Cách xác minh story này hoạt động riêng lẻ]

### Kiểm thử cho User Story 2 (TÙY CHỌN - chỉ khi có yêu cầu kiểm thử) ⚠️

- [ ] T018 [P] [US2] Kiểm thử hợp đồng (Contract test) cho [endpoint] trong tests/contract/test_[name].py
- [ ] T019 [P] [US2] Kiểm thử tích hợp (Integration test) cho [hành trình người dùng] trong tests/integration/test_[name].py

### Triển khai cho User Story 2

- [ ] T020 [P] [US2] Tạo model [Entity] trong src/models/[entity].py
- [ ] T021 [US2] Triển khai [Service] trong src/services/[service].py
- [ ] T022 [US2] Triển khai [endpoint/feature] trong src/[location]/[file].py
- [ ] T023 [US2] Tích hợp với các thành phần của User Story 1 (nếu cần)

**Trạm kiểm tra (Checkpoint)**: Tại thời điểm này, cả User Story 1 VÀ 2 đều phải hoạt động độc lập

---

## Phase 5: User Story 3 - [Tiêu đề] (Ưu tiên: P3)

**Mục tiêu**: [Mô tả ngắn gọn những gì story này mang lại]

**Kiểm thử Độc lập**: [Cách xác minh story này hoạt động riêng lẻ]

### Kiểm thử cho User Story 3 (TÙY CHỌN - chỉ khi có yêu cầu kiểm thử) ⚠️

- [ ] T024 [P] [US3] Kiểm thử hợp đồng (Contract test) cho [endpoint] trong tests/contract/test_[name].py
- [ ] T025 [P] [US3] Kiểm thử tích hợp (Integration test) cho [hành trình người dùng] trong tests/integration/test_[name].py

### Triển khai cho User Story 3

- [ ] T026 [P] [US3] Tạo model [Entity] trong src/models/[entity].py
- [ ] T027 [US3] Triển khai [Service] trong src/services/[service].py
- [ ] T028 [US3] Triển khai [endpoint/feature] trong src/[location]/[file].py

**Trạm kiểm tra (Checkpoint)**: Tất cả các user stories giờ đây phải có chức năng độc lập

---

[Thêm nhiều phase user story hơn nếu cần, theo cùng một mẫu]

---

## Phase N: Trau chuốt (Polish) & Các Vấn đề Xuyên suốt (Cross-Cutting Concerns)

**Mục đích**: Các cải tiến ảnh hưởng đến nhiều user stories

- [ ] TXXX [P] Cập nhật tài liệu trong docs/
- [ ] TXXX Dọn dẹp code và tái cấu trúc (refactoring)
- [ ] TXXX Tối ưu hóa hiệu suất trên tất cả các stories
- [ ] TXXX [P] Các bài test unit bổ sung (nếu được yêu cầu) trong tests/unit/
- [ ] TXXX Tăng cường bảo mật
- [ ] TXXX Chạy xác minh quickstart.md

---

## Phụ thuộc (Dependencies) & Thứ tự Thực thi

### Phụ thuộc giữa các Phase

- **Thiết lập (Phase 1)**: Không có phụ thuộc - có thể bắt đầu ngay lập tức
- **Nền tảng (Phase 2)**: Phụ thuộc vào việc hoàn thành Thiết lập - CHẶN (BLOCKS) tất cả các user stories
- **User Stories (Phase 3+)**: Tất cả đều phụ thuộc vào việc hoàn thành phase Nền tảng
  - Các user stories sau đó có thể tiến hành song song (nếu đủ nhân sự)
  - Hoặc theo tuần tự ưu tiên (P1 → P2 → P3)
- **Trau chuốt (Phase Cuối)**: Phụ thuộc vào việc tất cả các user stories mong muốn đã hoàn thành

### Phụ thuộc giữa các User Story

- **User Story 1 (P1)**: Có thể bắt đầu sau Nền tảng (Phase 2) - Không phụ thuộc vào các stories khác
- **User Story 2 (P2)**: Có thể bắt đầu sau Nền tảng (Phase 2) - Có thể tích hợp với US1 nhưng phải có thể kiểm thử độc lập
- **User Story 3 (P3)**: Có thể bắt đầu sau Nền tảng (Phase 2) - Có thể tích hợp với US1/US2 nhưng phải có thể kiểm thử độc lập

### Bên trong Mỗi User Story

- Các bài kiểm thử (nếu có) BẮT BUỘC phải được viết và THẤT BẠI trước khi triển khai
- Models trước khi đến services
- Services trước khi đến endpoints
- Triển khai phần lõi (Core) trước khi tích hợp
- Hoàn thành story trước khi chuyển sang mức độ ưu tiên tiếp theo

### Cơ hội Song song (Parallel Opportunities)

- Tất cả các tác vụ Thiết lập được đánh dấu [P] có thể chạy song song
- Tất cả các tác vụ Nền tảng được đánh dấu [P] có thể chạy song song (trong Phase 2)
- Khi phase Nền tảng hoàn thành, tất cả các user stories có thể bắt đầu song song (nếu năng lực đội ngũ cho phép)
- Tất cả các bài kiểm thử cho một user story được đánh dấu [P] có thể chạy song song
- Models trong một story được đánh dấu [P] có thể chạy song song
- Các user stories khác nhau có thể được làm song song bởi các thành viên khác nhau trong đội ngũ

---

## Ví dụ Song song: User Story 1

```bash
# Khởi chạy tất cả các bài kiểm thử cho User Story 1 cùng nhau (nếu được yêu cầu):
Task: "Kiểm thử hợp đồng cho [endpoint] trong tests/contract/test_[name].py"
Task: "Kiểm thử tích hợp cho [hành trình người dùng] trong tests/integration/test_[name].py"

# Khởi tạo tất cả models cho User Story 1 cùng nhau:
Task: "Tạo model [Entity1] trong src/models/[entity1].py"
Task: "Tạo model [Entity2] trong src/models/[entity2].py"
```

---

## Chiến lược Triển khai (Implementation Strategy)

### MVP Trước tiên (Chỉ User Story 1)

1. Hoàn thành Phase 1: Thiết lập
2. Hoàn thành Phase 2: Nền tảng (ĐẶC BIỆT QUAN TRỌNG - chặn tất cả các stories)
3. Hoàn thành Phase 3: User Story 1
4. **DỪNG và XÁC MINH**: Kiểm thử độc lập User Story 1
5. Triển khai/demo nếu sẵn sàng

### Phân phối Tăng dần (Incremental Delivery)

1. Hoàn thành Thiết lập + Nền tảng → Nền tảng sẵn sàng
2. Thêm User Story 1 → Kiểm thử độc lập → Triển khai/Demo (MVP!)
3. Thêm User Story 2 → Kiểm thử độc lập → Triển khai/Demo
4. Thêm User Story 3 → Kiểm thử độc lập → Triển khai/Demo
5. Mỗi story gia tăng giá trị mà không làm hỏng các stories trước đó

### Chiến lược Nhóm Song song (Parallel Team Strategy)

Khi có nhiều lập trình viên:

1. Cả nhóm cùng nhau hoàn thành Thiết lập + Nền tảng
2. Khi Nền tảng đã xong:
   - Lập trình viên A: User Story 1
   - Lập trình viên B: User Story 2
   - Lập trình viên C: User Story 3
3. Các stories hoàn thành và được tích hợp một cách độc lập

---

## Ghi chú

- Tác vụ [P] = các file khác nhau, không có sự phụ thuộc
- Nhãn [Story] ánh xạ tác vụ vào user story cụ thể để dễ dàng truy xuất (traceability)
- Mỗi user story nên có thể được hoàn thành và kiểm thử độc lập
- Xác minh các bài kiểm thử thất bại trước khi triển khai code
- Commit sau mỗi tác vụ hoặc nhóm hợp lý
- Dừng ở bất kỳ trạm kiểm tra nào để xác minh story một cách độc lập
- Tránh: các tác vụ mơ hồ, xung đột cùng một file, các phụ thuộc chéo giữa các story làm phá vỡ tính độc lập
