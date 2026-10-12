# Hợp đồng Thời gian thực SignalR: TableHub

**Lớp Trung tâm (Hub Class)**: `TableHub : AbpHub`  
**Đường dẫn Hub (Route)**: `/signalr-hubs/table`  
**Xác thực**: Yêu cầu Bearer JWT Token khi kết nối  

---

## 1. Kết nối Hub (Client Connection)

Client Angular kết nối tới Hub sử dụng thư viện `@microsoft/signalr`:
```typescript
const connection = new signalR.HubConnectionBuilder()
  .withUrl(environment.oAuthConfig.issuer + '/signalr-hubs/table', {
    accessTokenFactory: () => this.oAuthService.getAccessToken()
  })
  .withAutomaticReconnect()
  .build();
```

---

## 2. Sự kiện từ Máy chủ phát về Client (Server-to-Client Events)

### Sự kiện: `TableStatusChanged`
Được phát tự động từ Server mỗi khi:
1. Nhân viên hoặc quản lý gọi API `/api/app/table/{id}/change-status`.
2. Có đơn hàng mới được tạo liên kết với bàn (chuyển sang `Occupied`).
3. Đơn hàng hoàn tất thanh toán từ RM-016 (chuyển sang `Cleaning`).
4. Nhân viên bấm xác nhận dọn dẹp xong (chuyển sang `Available`).
5. Một khu vực bị vô hiệu hóa (phát sự kiện đổi trạng thái cho tất cả các bàn trong khu vực sang `Disabled` / `Inactive`).
6. Một bàn bị vô hiệu hóa hoặc kích hoạt lại từ giao diện `/waiter/tables`.

**Tải trọng dữ liệu (Payload)**:
```json
{
  "tableId": "e6a00486-5085-48b9-873d-9e66c61bf6a7",
  "tableName": "Bàn 01",
  "diningAreaId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": 1,
  "statusName": "Occupied",
  "updatedTime": "2026-10-09T14:30:00Z"
}
```

---

## 3. Client Handler (Phía Angular)

Trong `table-signalr.service.ts`:
```typescript
connection.on('TableStatusChanged', (data: TableStatusChangedDto) => {
  // Cập nhật tức thì thẻ bàn trong danh sách bộ nhớ mà không cần tải lại toàn bộ trang
  this.tableStore.updateTableStatus(data.tableId, data.status);
});
```
