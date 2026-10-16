# Hợp đồng Kiến trúc & Giao diện API: RM-017 Làm lại trang Quản lý bàn

**Tính năng**: `RM-017 — Làm lại trang Quản lý bàn (Table Management Redesign)`  
**Ngày**: 2026-10-16  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Hợp đồng REST API Backend

### 1.1 Chuyển Bàn Ăn (`TransferTableAsync`)
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/app/table/transfer`
- **Bảo mật**: `[Authorize(TooHungryPermissions.Tables.UpdateStatus)]` hoặc `TooHungryPermissions.Tables.Manage`
- **Body Request**:
  ```json
  {
    "sourceTableId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "targetTableId": "4ba85f64-5717-4562-b3fc-2c963f66afa7",
    "note": "Khách đổi sang bàn ngoài sân vườn"
  }
  ```
- **Xử lý Nghiệp vụ Backend**:
  1. Kiểm tra Bàn nguồn (`SourceTable`): Bắt buộc đang ở trạng thái `Occupied`.
  2. Kiểm tra Bàn đích (`TargetTable`): Bắt buộc đang ở trạng thái `Available` (và không bị `Disabled`).
  3. Lấy Đơn hàng đang mở của Bàn nguồn (nếu có): Cập nhật `Order.TableId = targetTableId`.
  4. Cập nhật Bàn đích:
     - `TargetTable.Status = TableStatus.Occupied`
     - `TargetTable.OccupiedTime = sourceTable.OccupiedTime ?? DateTime.Now`
  5. Cập nhật Bàn nguồn:
     - Nếu có đơn hàng / đã dùng món: `SourceTable.Status = TableStatus.Cleaning`.
     - Nếu không có đơn hàng: `SourceTable.Status = TableStatus.Available`.
     - `SourceTable.OccupiedTime = null`.
  6. Lưu vào cơ sở dữ liệu và phát SignalR cập nhật cả 2 bàn.
- **Mã phản hồi**:
  - `200 OK`: Trả về `TableDto` của bàn đích.
  - `400 Bad Request`: Lỗi nghiệp vụ (bàn nguồn không có khách hoặc bàn đích không trống).
  - `404 Not Found`: Không tìm thấy một trong hai bàn.

---

### 1.2 Gộp Bàn Ăn (`MergeTablesAsync`)
- **Phương thức**: `POST`
- **Đường dẫn**: `/api/app/table/merge`
- **Bảo mật**: `[Authorize(TooHungryPermissions.Tables.UpdateStatus)]` hoặc `TooHungryPermissions.Tables.Manage`
- **Body Request**:
  ```json
  {
    "primaryTableId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "secondaryTableId": "5ca85f64-5717-4562-b3fc-2c963f66afa8",
    "note": "Gộp bàn đoàn khách 12 người"
  }
  ```
- **Xử lý Nghiệp vụ Backend**:
  1. Kiểm tra cả 2 bàn đều đang ở trạng thái `Occupied`.
  2. Nạp Đơn hàng mở của Bàn chính (`orderA`) và Bàn phụ (`orderB`).
  3. Nếu Bàn phụ có `orderB`:
     - Chuyển toàn bộ món từ `orderB` sang `orderA`.
     - Tính toán lại `orderA.TotalAmount`.
     - Đóng `orderB` (trạng thái `Cancelled` hoặc `Completed` kèm ghi chú đã gộp vào Bàn chính).
  4. Giải phóng Bàn phụ: `SecondaryTable.Status = TableStatus.Cleaning`, `SecondaryTable.OccupiedTime = null`.
  5. Lưu vào cơ sở dữ liệu và phát SignalR cập nhật Bàn phụ và Bàn chính.
- **Mã phản hồi**:
  - `200 OK`: Trả về `TableDto` của bàn chính.
  - `400 Bad Request`: Lỗi nghiệp vụ.

---

## 2. Hợp đồng Angular Service Proxy

```typescript
// angular/src/app/proxy/tables/table.service.ts
@Injectable({ providedIn: 'root' })
export class TableService {
  // ... các hàm hiện có ...

  transferTable = (input: TransferTableInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableDto>({
      method: 'POST',
      url: '/api/app/table/transfer',
      body: input,
    }, { apiName: this.apiName, ...config });

  mergeTables = (input: MergeTablesInputDto, config?: Partial<Rest.Config>) =>
    this.restService.request<any, TableDto>({
      method: 'POST',
      url: '/api/app/table/merge',
      body: input,
    }, { apiName: this.apiName, ...config });
}
```

---

## 3. Hợp đồng Sự kiện Thời gian thực SignalR (`TableHub`)

### Sự kiện `tableStatusChanged`
Được phát mỗi khi trạng thái của một bàn ăn thay đổi:

- **Tên sự kiện**: `tableStatusChanged`
- **Payload**:
  ```typescript
  export interface TableStatusChangedPayload {
    tableId: string;
    newStatus: TableStatus;
    tableName?: string;
    diningAreaId?: string;
    occupiedTime?: string | null; // ISO DateTime string
  }
  ```
- **Hành vi Máy khách (Client)**:
  - Cập nhật trực tiếp phần tử trong mảng tín hiệu `tables.update(...)`.
  - Nếu `occupiedTime` có giá trị, tự động kích hoạt đếm giờ và phân tầng cảnh báo.
  - Cập nhật lại chỉ số trên thanh thống kê mặt bằng (Floor Summary Indicators).
