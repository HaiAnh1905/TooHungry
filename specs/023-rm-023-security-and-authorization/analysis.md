# Báo cáo Phân tích Kiểm chéo (Cross-Artifact Analysis): RM-023 Bảo mật & Chuẩn hóa Phân quyền Hệ thống

**Tính năng**: `RM-023 — Bảo mật & Chuẩn hóa Phân quyền Hệ thống (Security & Authorization Enforcement)`  
**Ngày thực hiện**: 2026-10-23  
**Trạng thái**: Đạt Phê duyệt 100% (Passed - Ready for Implementation)  
**Tài liệu đối chiếu**:
- Đặc tả Nghiệp vụ: [spec.md](spec.md)
- Kế hoạch Triển khai: [plan.md](plan.md)
- Danh sách Công việc: [tasks.md](tasks.md)
- Báo cáo Nghiên cứu Kỹ thuật: [research.md](research.md)
- Thiết kế Mô hình Dữ liệu: [data-model.md](data-model.md)
- Hợp đồng Giao tiếp & Phân quyền: [contracts/security-contracts.md](contracts/security-contracts.md)
- Hướng dẫn Kiểm định: [quickstart.md](quickstart.md)
- Checklist Kiểm soát Chất lượng: [checklists/requirements.md](checklists/requirements.md)

---

## 1. Mục tiêu Phân tích

Tiến hành kiểm chéo toàn diện tính nhất quán, tính khả thi và độ bao phủ giữa:
1. **Yêu cầu Nghiệp vụ (`spec.md`)** với **Giải pháp Kỹ thuật (`plan.md`, `research.md`)**.
2. **Kế hoạch Triển khai (`plan.md`)** với **Danh sách Công việc Cụ thể (`tasks.md`)**.
3. **Các Quyết định Vận hành Thống nhất (`/speckit.clarify`)** với **Hợp đồng Component & Thiết kế Dữ liệu**.
4. **Hiện trạng Mã nguồn thực tế** với **Các can thiệp kỹ thuật dự kiến thực thi**.
5. **Hiến pháp Dự án (`constitution.md`)** với **Toàn bộ hồ sơ thiết kế**.

---

## 2. Ma trận Ánh xạ & Độ Phủ (Traceability Matrix)

### 2.1 Ánh xạ User Stories ↔ Yêu cầu Chức năng ↔ Tiêu chí Thành công ↔ Tasks Triển khai

| User Story | Yêu cầu Chức năng (FR) | Tiêu chí Thành công (SC) | Tasks Triển khai (`tasks.md`) | Đánh giá Khớp nối |
|---|---|---|---|---|
| **Setup & i18n Foundation** | FR-019 | SC-007 | `T001`, `T002`, `T003`, `T004` | **Khớp 100%**: Chuẩn bị đầy đủ thông điệp lỗi bảo mật song ngữ đồng bộ trong `vi.json` và `en.json` (cả Backend Domain.Shared và Frontend assets). |
| **Foundational: Secrets & Host Sanitation** | FR-015, FR-016, FR-017 | SC-005, SC-006 | `T005`, `T006`, `T007` | **Khớp 100%**: Thay thế secrets bằng placeholder chuẩn `__CONFIGURE_VIA_ENV_OR_USER_SECRETS__`, file mẫu `appsettings.secrets.example.json`, tắt ShowPII và Swagger UI trên Production, chốt chặn Fail-fast Startup. |
| **US1 (P1): Bảo mật Endpoints Backend & Upload Tệp An toàn** | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006 | SC-001, SC-002, SC-007 | `T008`, `T009`, `T010`, `T011`, `T012`, `T013`, `T014`, `T015` | **Khớp 100%**: Thêm `[Authorize]` trên `MediaController` (`Dishes.Edit`), `DailyMenuAppService` (`Dishes.Default`), `RecipeController` (`Recipes.Default`), `DishCategoryAppService` (CRUD phân rã), `TableOrderController` (`Orders.Default`, `Orders.Edit`); bộ kiểm tra 3 lớp (Extension, MIME, Magic Bytes) và tên GUID ngẫu nhiên; bài test kiểm thử tự động đi kèm. |
| **US2 (P1): Bảo vệ Kênh Kết nối Realtime SignalR Hub** | FR-007, FR-008, FR-009, FR-020 | SC-001, SC-007 | `T016`, `T017`, `T018` | **Khớp 100%**: Thêm `[Authorize]` trên `TableHub.cs`; phía client `TableSignalRService.ts` truyền token qua `accessTokenFactory`, chỉ kết nối khi đã login, tự động refresh token khi gặp 401, ngắt kết nối khi logout; Unit test xác thực kèm theo. |
| **US3 (P1): Gắn Chỉ thị `*abpPermission` trên 8 Phân hệ UI** | FR-010 | SC-004 | `T019`, `T020`, `T021`, `T022`, `T023`, `T024`, `T025` | **Khớp 100%**: Bao bọc toàn bộ nút thao tác nhạy cảm trên 8 phân hệ màn hình Angular (`dishes`, `dish-categories`, `orders`, `tables`, `dining-areas`, `inventory`, `recipes`, `identity users/roles`). |
| **US4 (P2): Loại bỏ Role Name Hardcode & Chuẩn hóa Router Guards** | FR-011, FR-012 | SC-003, SC-007 | `T026`, `T027`, `T028`, `T029`, `T030` | **Khớp 100%**: Xóa bỏ `['Manager', 'Administrator', 'admin']` và `['Waiter', ...]` tại `waiter-auth.guard.ts`, `dashboard.guard.ts`, `user-role-navigation.service.ts`, `waiter-layout`, `inventory-keeper-layout`; chuyển 100% sang phân luồng động qua `permissionService.getGrantedPolicy$`. |
| **US6 (P3): Chuẩn hóa Quản trị Quyền Role & Khắc phục API Thiếu Mã hóa** | FR-013, FR-014 | SC-007 | `T031`, `T032` | **Khớp 100%**: Mã hóa an toàn `encodeURIComponent(providerKey)` trong `roles.ts`, loại bỏ `HttpClient` thừa và chặn gọi `updateRoles` dư thừa trong `users.ts`. |
| **Polish, Verification & VietQR Safety** | FR-018, SC-001..007 | SC-001..007 | `T033`, `T034`, `T035`, `T036` | **Khớp 100%**: Bảo vệ thông tin tài khoản VietQR trong environment, chạy toàn bộ test suites Backend & Frontend build, nghiệm thu đầy đủ 6 kịch bản theo `quickstart.md`. |

---

### 2.2 Độ phủ Yêu cầu (Coverage Ratio)
- **Yêu cầu Chức năng (Functional Requirements)**: **20/20 FR (100% COVERAGE)**
- **Tiêu chí Thành công (Success Criteria)**: **7/7 SC (100% COVERAGE)**
- **Nhiệm vụ Triển khai (Tasks)**: **36/36 Tasks (100% MAPPED)**
- **Khoảng trống Yêu cầu (Requirements Gaps)**: **0 (Zero Gaps)**
- **Nhiệm vụ Mồ côi (Orphaned Tasks)**: **0 (Zero Orphaned Tasks)**

---

## 3. Kiểm tra Tính Nhất quán với 5 Quyết định Làm rõ (`/speckit.clarify`)

1. **Quyết định 1: Phân luồng Router Guards động 100% qua ABP Granular Policies**:
   - `spec.md`: A4, FR-011, FR-012.
   - `plan.md`: Bối cảnh kỹ thuật, Phase 5.
   - `research.md`: Mục 5 Phân luồng điều hướng theo Policies.
   - `contracts`: `IUserRoleNavigationService.resolveLandingRoute$()`, `canNavigateToAdmin$()`.
   - `tasks.md`: `T026`, `T027`, `T028`, `T029`, `T030`.
   - *Đánh giá*: **Khớp 100%**. Triệt tiêu hoàn toàn sự phụ thuộc vào tên role cố định.

2. **Quyết định 2: Xác thực Upload Ảnh 3 Lớp & Đổi Tên File GUID**:
   - `spec.md`: A1, FR-002.
   - `plan.md`: Phase 2.
   - `research.md`: Mục 2 Cơ chế phòng vệ 3 lớp.
   - `data-model.md`: Bảng Magic Bytes nhị phân (JPEG, PNG, GIF, WEBP) và thuật toán `SafeImageFileValidator`.
   - `contracts`: Hợp đồng `POST /api/app/media/upload-dish-image`.
   - `tasks.md`: `T009`, `T010`, `T011`.
   - *Đánh giá*: **Khớp 100%**. Ngăn chặn tuyệt đối giả mạo tệp và tấn công Path Traversal.

3. **Quyết định 3: Vệ sinh Secrets Chuẩn .NET & Chốt chặn Fail-fast Startup**:
   - `spec.md`: A6, FR-015, FR-016, FR-017.
   - `plan.md`: Phase 1.
   - `research.md`: Mục 6 Phân tầng nạp bí mật .NET.
   - `data-model.md`: Thứ tự ưu tiên cấu hình nạp bí mật.
   - `tasks.md`: `T005`, `T006`, `T007`.
   - *Đánh giá*: **Khớp 100%**. Repo sạch hoàn toàn bí mật, máy chủ tự bảo vệ trên Production.

4. **Quyết định 4: Quản trị Vòng đời SignalR Hub theo Trạng thái Auth**:
   - `spec.md`: A2, FR-007, FR-008, FR-009, FR-020.
   - `plan.md`: Phase 3.
   - `research.md`: Mục 3 SignalR Auth Lifecycle.
   - `contracts`: Hợp đồng `ITableSignalRService`.
   - `tasks.md`: `T016`, `T017`, `T018`.
   - *Đánh giá*: **Khớp 100%**. Chống nghe lén WebSocket, tự động phục hồi kết nối khi token hết hạn.

5. **Quyết định 5: Phân quyền Hạt nhân Hoàn tất Đơn Bàn ăn (`Orders.Edit`)**:
   - `spec.md`: A1, FR-006.
   - `plan.md`: Phase 2.
   - `contracts`: Hợp đồng `TableOrderController.complete/{tableId}`.
   - `tasks.md`: `T015`.
   - *Đánh giá*: **Khớp 100%**. Chỉ người dùng có thẩm quyền xử lý đơn mới được kích hoạt hoàn tất và khấu trừ kho FEFO.

---

## 4. Tuân thủ Hiến pháp Dự án Acme.TooHungry (Constitution Alignment)

| Điều khoản Hiến pháp | Yêu cầu Quy định | Tình trạng Đáp ứng | Đánh giá |
|---|---|:---:|---|
| **I. DDD & Phân lớp ABP** | Domain nắm giữ logic cốt lõi; Controllers/AppServices thực thi phân quyền và điều phối. | **ĐẠT** | Controllers và AppServices chỉ thêm `[Authorize]` và validate DTO, không xâm lấn domain logic. |
| **II. UML & Domain Alignment** | Nhất quán với mô hình nghiệp vụ `RMS-TH.vpp`. | **ĐẠT** | Mô hình phân quyền `TooHungryPermissions` khớp chuẩn thiết kế UML. |
| **III. Test-First & Cổng chất lượng** | Kiểm thử tự động đầy đủ trước khi nghiệm thu. | **ĐẠT** | 5 tasks kiểm thử tự động chuyên biệt (`T008`, `T009`, `T016`, `T030`, `T034`) cho Auth, Upload và Concurrency. |
| **IV. Hợp đồng API Nghiêm ngặt** | Định kiểu mạnh, API trả về cấu trúc chuẩn ABP, tắt Swagger trên Production. | **ĐẠT** | Hợp đồng API chi tiết tại `contracts/security-contracts.md`, Swagger chỉ bật ở Development. |
| **V. Bảo mật & Auditing by Default** | Nguyên tắc đặc quyền tối thiểu, không lộ bí mật, bảo vệ WebSocket. | **ĐẠT** | Xử lý triệt để 9 lỗi bảo mật phát hiện từ `CODE_REVIEW.md`. |
| **VI. Nhất quán UI/UX & Theme Cam - Trắng** | Ẩn/hiện nút mượt mà, không phá vỡ layout, bảo toàn trải nghiệm realtime. | **ĐẠT** | Gắn `*abpPermission` sạch sẽ, SignalR tự động refresh token mượt mà. |
| **VII. Quốc tế hóa (I18N)** | 100% thông điệp bảo mật hỗ trợ song ngữ Tiếng Việt & Tiếng Anh. | **ĐẠT** | Bổ sung đầy đủ cặp từ điển trong `vi.json` và `en.json` (Domain.Shared và Angular assets). |
| **VIII. Ngôn ngữ Tài liệu** | Toàn bộ hồ sơ tài liệu được biên soạn bằng Tiếng Việt. | **ĐẠT** | 100% hồ sơ tài liệu soạn thảo bằng Tiếng Việt chuẩn mực. |

---

## 5. Kết luận & Độ Sẵn sàng (Readiness Conclusion)

- **Số lỗi / Điểm xung đột phát hiện**: **0 (Zero Conflicts)**.
- **Số điểm mơ hồ cần làm rõ thêm**: **0 (Zero Ambiguities)**.
- **Độ sẵn sàng Triển khai (Readiness for Implementation)**: **100% PASS**.
- **Khuyến nghị**: Sẵn sàng tuyệt đối để tiến hành lập trình thực thi mã nguồn (`/speckit.implement RM-023`).
