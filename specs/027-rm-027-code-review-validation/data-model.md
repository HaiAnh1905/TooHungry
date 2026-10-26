# Mô hình Dữ liệu Đối soát & Kiểm toán (Audit Data Model): RM-027

**Mã Tính năng**: `RM-027`  
**Ngày thực hiện**: 2026-10-26  
**Mục tiêu**: Định nghĩa cấu trúc dữ liệu, ma trận trạng thái, và các thực thể phục vụ quy trình kiểm định, đối soát độc lập 68 tiêu chí mã nguồn từ [CODE_REVIEW.md](../../CODE_REVIEW.md).

---

## 1. Các Thực thể Chính (Core Audit Entities)

### 1.1. CodeReviewItem (Hạng mục Rà soát)
Đại diện cho 1 tiêu chí / vấn đề được ghi nhận trong tài liệu `CODE_REVIEW.md`.

| Trường dữ liệu | Kiểu dữ liệu | Bắt buộc | Mô tả |
|----------------|--------------|----------|-------|
| `ItemId` | `string` | Có | Khóa định danh duy nhất (ví dụ: `BE-01` đến `BE-34`, `FE-01` đến `FE-34`). |
| `Layer` | `enum` | Có | Tầng công nghệ: `Backend` (ABP .NET) hoặc `Frontend` (Angular). |
| `Severity` | `enum` | Có | Mức độ rủi ro ban đầu: `Critical` (🔴 Nghiêm trọng), `Medium` (🟡 Trung bình), `Minor` (🟢 Nhỏ). |
| `Category` | `string` | Có | Phân nhóm nghiệp vụ (ví dụ: `DataIntegrity`, `Security`, `DatabasePerf`, `AngularArchitecture`). |
| `OriginalLocation` | `string` | Có | Tệp tin và dòng code phát hiện ban đầu trong `CODE_REVIEW.md`. |
| `ProblemSummary` | `string` | Có | Mô tả ngắn gọn bản chất lỗi và hậu quả nếu không xử lý. |
| `RecommendedFix` | `string` | Có | Hướng dẫn hoặc gợi ý sửa lỗi ban đầu từ tài liệu rà soát. |

---

### 1.2. VerificationRecord (Bản ghi Đối soát & Nghiệm thu)
Đại diện cho kết quả kiểm định thực tế của 1 `CodeReviewItem` đối chiếu với mã nguồn hiện tại của dự án.

| Trường dữ liệu | Kiểu dữ liệu | Bắt buộc | Mô tả |
|----------------|--------------|----------|-------|
| `ItemId` | `string` | Có | Khóa ngoại tham chiếu đến `CodeReviewItem.ItemId`. |
| `OwningRoadmapId` | `string` | Có | Hạng mục Roadmap giải quyết vấn đề (`RM-019`, `RM-022`, `RM-023`, `RM-024`, `RM-025`, `RM-026`). |
| `Status` | `enum` | Có | Trạng thái đối soát: `VERIFIED`, `IN_PROGRESS`, `JUSTIFIED_EXCEPTION`. |
| `ActiveCodeLocation` | `string` | Có | Đường dẫn tệp tin thực tế và tên hàm/lớp đang chứa mã nguồn giải pháp. |
| `TestReference` | `string` | Không | Tên bài test tự động (xUnit class/method hoặc test script) xác thực giải pháp. |
| `VerificationMethod` | `enum` | Có | Phương thức xác minh: `AutomatedTest`, `StaticInspection`, `CompilerStrictCheck`. |
| `AuditNotes` | `string` | Không | Ghi chú kỹ thuật giải trình giải pháp hoặc lý do chấp nhận ngoại lệ. |
| `VerifiedAt` | `DateTime` | Có | Thời điểm hoàn thành xác minh. |

---

### 1.3. AuditSignoffReport (Biên bản Nghiệm thu Wave 5)
Đại diện cho báo cáo tổng hợp chất lượng kỹ thuật toàn diện của hệ thống sau khi đối soát xong 68 mục.

| Trường dữ liệu | Kiểu dữ liệu | Bắt buộc | Mô tả |
|----------------|--------------|----------|-------|
| `ReportId` | `string` | Có | Định danh báo cáo (ví dụ: `AUDIT-WAVE5-20261026`). |
| `AuditDate` | `DateTime` | Có | Ngày lập biên bản nghiệm thu. |
| `TotalItems` | `int` | Có | Tổng số hạng mục được đối soát (cố định: 68). |
| `CriticalTotal` | `int` | Có | Tổng số lỗi Nghiêm trọng (21: 12 BE + 9 FE). |
| `CriticalVerified` | `int` | Có | Số lỗi Nghiêm trọng đã khắc phục (BẮT BUỘC = `CriticalTotal`). |
| `MediumTotal` | `int` | Có | Tổng số lỗi Trung bình (34: 19 BE + 15 FE). |
| `MediumVerified` | `int` | Có | Số lỗi Trung bình đã khắc phục. |
| `MinorTotal` | `int` | Có | Tổng số lỗi Nhỏ (13: 3 BE + 10 FE). |
| `MinorVerified` | `int` | Có | Số lỗi Nhỏ đã khắc phục. |
| `BackendTestCount` | `int` | Có | Tổng số bài test tự động Backend đã chạy. |
| `BackendTestPassRate`| `decimal` | Có | Tỷ lệ test đạt (BẮT BUỘC = 100%). |
| `BuildStatus` | `enum` | Có | Trạng thái biên dịch: `CleanSuccess` (0 Errors), `WarningOnly`, `Failed`. |
| `Verdict` | `enum` | Có | Kết luận nghiệm thu: `Approved`, `ConditionalApproval`, `Rejected`. |
| `ResidualRisks` | `list<string>`| Không | Danh sách các nợ kỹ thuật tồn đọng (nếu có) được chấp thuận theo dõi. |

---

## 2. Máy Trạng thái Đối soát (Verification State Machine)

Mỗi tiêu chí trong số 68 mục trải qua chu trình trạng thái khép kín:

```text
       ┌──────────────┐
       │     OPEN     │ (Chưa đối soát / Hiện trạng ban đầu)
       └──────┬───────┘
              │ Bắt đầu giám định code & test harness
              ▼
       ┌──────────────┐
       │  VERIFYING   │ (Đang đối chiếu code thực tế & chạy test)
       └──────┬───────┘
              │
       ───────┴────────────────────────┬─────────────────────────┐
       │                               │                         │
       ▼ (Code đã sửa & Test PASS)     ▼ (Thuộc RM chưa xong)    ▼ (Có giải pháp kiến trúc khác/Loại scope)
┌──────────────┐               ┌──────────────┐          ┌───────────────────────┐
│   VERIFIED   │               │ IN_PROGRESS  │          │  JUSTIFIED_EXCEPTION  │
└──────────────┘               └──────────────┘          └───────────────────────┘
```

### Quy tắc Chuyển trạng thái (Transition Invariants):
1. Không được chuyển sang `VERIFIED` nếu là lỗi Nghiêm trọng (🔴) mà không có mã nguồn thực tế và test case kiểm chứng.
2. Trạng thái `JUSTIFIED_EXCEPTION` bắt buộc phải kèm theo `AuditNotes` ghi rõ lý do kiến trúc (ví dụ: DDD Rich Domain thay thế AppService, hoặc tính năng bị loại khỏi Roadmap theo quyết định đã chốt).
3. Báo cáo nghiệm thu chỉ đạt kết luận `Approved` khi:
   - `count(Status == VERIFIED where Severity == Critical) == 21` (100% Critical resolved).
   - `count(Status == IN_PROGRESS where Severity == Critical) == 0`.

---

## 3. Phân bổ Trách nhiệm theo Hạng mục Roadmap (Roadmap Allocation Matrix)

| Gói Roadmap | Phân hệ | Danh sách tiêu chí `CODE_REVIEW.md` phụ trách | Số lượng |
|-------------|---------|-----------------------------------------------|----------|
| **RM-019** | Error Pages & Recovery | FE #2 (Route `/table/layout` crash -> `/tables` + wildcard `**`) | 1 |
| **RM-022** | Backend Hardening | BE #1, #2, #3, #4, #5, #10, #11, #12, #14, #15, #16, #25, #26, #28, #29 | 15 |
| **RM-023** | Security & Auth | BE #6, #7, #8, #9, #30; FE #4, #7, #9, #19, #31 | 10 |
| **RM-024** | Angular Refactoring | FE #1, #3, #5, #6, #8, #10, #11, #12, #13, #14, #15, #16, #17, #18, #20, #21, #22, #23, #24, #26, #30, #32, #34 | 23 |
| **RM-025** | DB Optimization & Clean Code | BE #13, #17, #18, #19, #20, #21, #22, #23, #24, #27, #31, #32, #33; FE #25, #27, #28, #29, #33 | 18 |
| **RM-026** | Automated Testing | BE #34 (Hệ thống kiểm thử tự động cho toàn bộ các ca phân quyền, tranh chấp, bất biến) | 1 |
| **Tổng cộng** | | **68 Tiêu chí Độc lập** | **68** |
