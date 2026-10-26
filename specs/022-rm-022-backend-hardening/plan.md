# Kế hoạch Triển khai (Implementation Plan): RM-022 Ổn định hóa & Vá lỗi Nghiêm trọng Backend (Backend Data Integrity & Concurrency Hardening)

**Nhánh (Branch)**: `022-rm-022-backend-hardening` | **Ngày**: 2026-10-22 | **Đặc tả (Spec)**: [spec.md](spec.md)

**Đầu vào (Input)**: Đặc tả tính năng từ `specs/022-rm-022-backend-hardening/spec.md` đã hoàn tất phiên làm rõ yêu cầu (`/speckit.clarify`) ngày 22-10-2026 với 5 quyết định tương tác & 10 định hướng kỹ thuật then chốt:
1. **Chống trừ kho 2 lần & Đóng băng đơn hàng**: Logic chuyển trạng thái đưa vào Domain methods `Order.Complete()` và `Order.Cancel()`. Chỉ trừ kho khi `oldStatus != Completed && newStatus == Completed`. Đóng băng hoàn toàn đơn đã `Completed`/`Cancelled`.
2. **Khắc phục Concurrency Retry & autoSave rải rác**: Bỏ `autoSave: true` trong vòng lặp trừ lô của `InventoryManager.DeductFefoAsync`; bọc vòng lặp retry concurrency trong Unit of Work mới độc lập (`IUnitOfWorkManager.Begin(requiresNew: true)`).
3. **Triệt tiêu lỗ hổng Client tự đặt giá & Validation DTO**: Xóa `UnitPrice` và `TotalAmount` khỏi input DTOs, tính giá 100% từ `Dish.Price` phía server; bổ sung validation `[Range(1, 999)] Quantity`, `[MinLength(1)] Items`, `[StringLength(512)] Note`.
4. **Chống Race Condition bàn ăn**: Cấu hình Filtered Unique Index EF Core cho `Order` bao quát trạng thái active (`[TableId] IS NOT NULL AND [Status] NOT IN (2, 3) AND [IsDeleted] = 0`); bắt `DbUpdateException` ném `BusinessException("TooHungry:Order:TableAlreadyHasActiveOrder")`.
5. **Chống Mass Assignment & Đóng gói Bàn ăn**: Xóa các trường trạng thái nội bộ khỏi `CreateUpdateTableDto`; đóng gói logic trạng thái vào Aggregate Root `RestaurantTable` (`Occupy()`, `Release()`, `MarkCleaning()`, `Reserve()`).
6. **Đồng bộ SignalR an toàn sau Commit**: Toàn bộ thông báo SignalR chỉ gửi sau khi CSDL commit thành công thông qua `CurrentUnitOfWork.OnCompleted(...)`.
7. **Sửa thuật toán Gộp bàn (`MergeTablesAsync`)**: Gom món trùng `DishId` về 1 dòng, tính lại giá niêm yết và ghép nối ghi chú chế biến: `"{primaryItem.Note} | [Gộp từ {secondaryTable.Name}: {secondaryItem.Note}]"`.
8. **Chuẩn hóa Đặt bàn, Khung giờ Mở cửa & Múi giờ UTC**: Khóa bàn trước 60 phút; `CheckInAsync` kiểm tra trạng thái bàn hiện tại; thống nhất giờ mở cửa 08:00 - 22:00 tại `TooHungryConsts`; thêm `[UnitOfWork]` cho worker; cấu hình `AbpClockOptions.Kind = Utc`, dùng `Clock.Now`.
9. **Sửa Tồn kho Dự báo & State Machine**: Bỏ nhân `ConversionFactor` 2 lần; State Machine một chiều (`Draft` $\rightarrow$ `Confirmed` $\rightarrow$ `Executed`); gom nhóm `GroupBy(x => x.DishId)` chống crash trùng món.
10. **Chuẩn hóa Dữ liệu Kiểm kê Kho**: Lô `ADJ-*` lấy đúng `PurchaseUnit` và `UnitCost` của `Ingredient`, hạn dùng lấy theo hạn xa nhất của các lô còn hạn (mặc định 30 ngày), mã lô ngẫu nhiên chống va chạm, chặn số lượng âm.

---

## Tóm tắt (Summary)

Kế hoạch triển khai gói giải pháp **Ổn định hóa & Vá lỗi Nghiêm trọng Backend (RM-022)** xử lý triệt để 15 vấn đề nghiêm trọng phát hiện từ `CODE_REVIEW.md`. Gói nâng cấp này tập trung củng cố kiến trúc Domain-Driven Design (DDD) của ABP Framework, chuyển đổi các Aggregate Roots anemic (`Order`, `RestaurantTable`) thành Rich Domain Models có khả năng tự bảo vệ các bất biến nghiệp vụ, tối ưu hóa các giao dịch Unit of Work và nâng cao khả năng chịu lỗi trong môi trường tương tranh cao tại giờ cao điểm của nhà hàng.

---

## Bối cảnh Kỹ thuật (Technical Context)

- **Ngôn ngữ/Nền tảng**: C# 13, .NET 10.0, ABP Framework 9.x
- **Truy cập Cơ sở Dữ liệu**: Entity Framework Core 9.x, SQL Server với Code-First Migrations
- **Thư viện Tích hợp**: SignalR Core, Volo.Abp.BackgroundWorkers, Volo.Abp.Timing
- **Kiểm thử**: xUnit, Shouldly, NSubstitute, Volo.Abp.TestBase
- **Nền tảng đích**: Backend Web API Service & Background Worker
- **Ràng buộc Hiệu năng**:
  - Không autoSave rải rác trong vòng lặp trừ kho, giảm 80% database roundtrips.
  - Thời gian xử lý transaction đặt đơn / cập nhật < 100ms.
- **Ràng buộc Toàn vẹn & I18N**:
  - ACID transaction trọn vẹn, không bao giờ để lại trạng thái dở dang khi gặp lỗi.
  - 100% mã lỗi nghiệp vụ mới có đầy đủ bản dịch trong `vi.json` và `en.json`.

---

## Kiểm tra Hiến pháp (Constitution Check)

*GATE: Phải vượt qua trước khi thực thi mã nguồn.*

- [x] **I. Domain-Driven Design & Phân lớp ABP**:
  - Toàn bộ logic nghiệp vụ chuyển trạng thái và invariant được chuyển vào tầng Domain (`Order.Complete()`, `Order.Cancel()`, `RestaurantTable.Occupy()`, `Release()`, `MarkCleaning()`, `Reserve()`). Tầng Application Service chỉ điều phối use case, không chứa logic nghiệp vụ thô.
- [x] **II. UML & Domain Model Alignment**:
  - Nhất quán 100% với cấu trúc thực thể và quan hệ trong `RMS-TH.vpp`.
- [x] **III. Test-First & Cổng chất lượng tự động**:
  - Lập kế hoạch bổ sung Unit Tests cho tính bất biến (Idempotency) của việc trừ kho, Unit Tests kiểm tra validation DTO, và Integration Tests mô phỏng xung đột tương tranh concurrency.
- [x] **IV. Hợp đồng API nghiêm ngặt**:
  - Toàn bộ endpoints và DTOs được định kiểu mạnh, tuân thủ hợp đồng chi tiết tại `contracts/backend-hardening-contracts.md`.
- [x] **V. Bảo mật, Kiểm toán (Auditing) & Multi-Tenancy**:
  - Kế thừa đầy đủ `FullAuditedAggregateRoot<Guid>`, loại bỏ nguy cơ can thiệp giá (Price Tampering) và ghi đè trạng thái (Mass Assignment).
- [x] **VI. Sự nhất quán UI/UX**:
  - Đảm bảo SignalR chỉ phát sau commit CSDL, tránh làm lệch trạng thái hiển thị trên giao diện người dùng.
- [x] **VII. Quốc tế hóa & Nội địa hóa (I18N)**:
  - 100% mã lỗi nghiệp vụ mới được đồng bộ song ngữ đầy đủ trong `vi.json` và `en.json`.
- [x] **VIII. Ngôn ngữ Tài liệu**:
  - Toàn bộ hồ sơ tài liệu được biên soạn bằng Tiếng Việt chuẩn mực.

---

## Cấu trúc Dự án (Project Structure)

### Tài liệu Đặc tả & Kế hoạch (specs/022-rm-022-backend-hardening/)
```text
specs/022-rm-022-backend-hardening/
├── spec.md                                 # Đặc tả nghiệp vụ và biên bản phiên làm rõ (/speckit.clarify)
├── plan.md                                 # Kế hoạch triển khai kiến trúc (tệp này)
├── research.md                             # Kết quả nghiên cứu 10 quyết định kỹ thuật Phase 0
├── data-model.md                           # Thiết kế Rich Domain Models, Filtered Indexes, DTOs, i18n
├── quickstart.md                           # Hướng dẫn kiểm thử 6 kịch bản xác thực trọng yếu
├── contracts/
│   └── backend-hardening-contracts.md     # Hợp đồng API, AppService, DomainService & SignalR
└── checklists/
    └── requirements.md                     # Bảng kiểm tra chất lượng đặc tả (Đạt 100% PASS)
```

### Mã nguồn Cần Triển khai & Tái cấu trúc
```text
src/Acme.TooHungry.Domain/
├── Orders/
│   └── Order.cs                            # Rich Domain: Complete(), Cancel(), RecalculateTotal()
├── Tables/
│   └── RestaurantTable.cs                  # Rich Domain: Occupy(), Release(), MarkCleaning(), Reserve()
├── Reservations/
│   └── TableReservationManager.cs         # Thống nhất giờ mở cửa, khóa bàn trước 60 phút, check-in guard
├── Inventories/
│   └── InventoryManager.cs                 # Bỏ autoSave rải rác, chuẩn hóa lô điều chỉnh tăng ADJ-*
└── TooHungryConsts.cs                      # Khai báo hằng số mở cửa tập trung (08:00 - 22:00)

src/Acme.TooHungry.Domain.Shared/
└── Localization/TooHungry/
    ├── vi.json                             # Bổ sung các mã lỗi nghiệp vụ Tiếng Việt
    └── en.json                             # Bổ sung các mã lỗi nghiệp vụ Tiếng Anh

src/Acme.TooHungry.Application.Contracts/
├── Orders/
│   └── OrderDtos.cs                        # Xóa UnitPrice/TotalAmount, thêm validation Range/MinLength/StringLength
└── Tables/
    └── TableDtos.cs                        # Xóa các trường trạng thái nội bộ chống Mass Assignment

src/Acme.TooHungry.Application/
├── Orders/
│   └── OrderAppService.cs                  # Tính giá server, đóng băng đơn, UoW retry, bắt lỗi Unique Index, SignalR on completed
├── Tables/
│   └── TableAppService.cs                  # Gộp bàn nối ghi chú, SignalR on completed, dùng TooHungryConsts
├── Inventories/
│   └── InventoryAppService.cs              # UoW retry độc lập cho khấu trừ kho
├── Forecasts/
│   └── ForecastAppServices.cs              # Sửa công thức tồn kho, State Machine kế hoạch, chống crash trùng món
└── Reservations/
    └── ReservationAutoCancelBackgroundWorker.cs # Thêm [UnitOfWork] bảo đảm tính nguyên tử

src/Acme.TooHungry.EntityFrameworkCore/
└── EntityFrameworkCore/
    ├── TooHungryDbContext.cs              # Filtered Index active order: Status NOT IN (2, 3); soft-delete filter
    └── Migrations/                         # Migration cập nhật Filtered Unique Index

test/Acme.TooHungry.Application.Tests/
├── Orders/
│   └── OrderAppService_Hardening_Tests.cs  # Kiểm thử chống trừ kho 2 lần, tính giá server, race condition
├── Tables/
│   └── TableAppService_Merge_Tests.cs      # Kiểm thử gộp bàn bảo toàn ghi chú và chống mass assignment
└── Forecasts/
    └── ForecastAppService_Hardening_Tests.cs # Kiểm thử công thức tồn kho và máy trạng thái kế hoạch
```

---

## Theo dõi Độ phức tạp (Complexity Tracking)

*Không phát hiện vi phạm Hiến pháp cần ngoại lệ.* Tất cả các thành phần kiến trúc đều tuân thủ chặt chẽ theo ABP Framework tiêu chuẩn, Domain-Driven Design (DDD) và quy chuẩn kỹ thuật của Acme.TooHungry.
