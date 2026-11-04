# Hợp đồng SignalR Thời gian thực (SignalR Contract): RM-028

**Tài liệu tham chiếu**: [spec.md](../spec.md) | [data-model.md](../data-model.md)  
**Hub Endpoint**: `/signalr-hubs/table` (mở rộng kết nối an toàn)

---

## 1. Phương thức Lắng nghe từ Client (Client Listeners)

| Tên Sự kiện (Event Name) | Bên Phát (Sender) | Bên Nhận (Receiver) | Payload DTO | Ý nghĩa Nghiệp vụ |
|:---|:---|:---|:---|:---|
| `TableStatusChanged` | Waiter / Cashier / Server | All Clients | `TableStatusChangedDto` | Trạng thái bàn thay đổi (`AVAILABLE`, `OCCUPIED`, `CLEANING`...) |
| `OrderPlacedOrUpdated` | Waiter | Cashier | `OrderPlacedOrUpdatedDto` | Waiter tạo đơn mới hoặc gọi thêm món từ bàn |
| `BillRequested` | Waiter | Cashier | `BillRequestedDto` | Waiter bấm "Yêu cầu thanh toán" cho bàn |
| `PaymentCompleted` | Cashier | Waiter & All | `PaymentCompletedDto` | Thu ngân hoàn tất thanh toán, đóng đơn và bàn chuyển `CLEANING` |
| `OrderStatusUpdated` | Cashier / Kitchen | Waiter | `OrderStatusUpdatedDto` | Cập nhật tiến độ chế biến / hoàn tất đơn món |

---

## 2. Chi tiết Payloads Sự kiện (Event Payloads)

### 2.1. `OrderPlacedOrUpdated`
```typescript
export interface OrderPlacedOrUpdatedDto {
  orderId: string;
  orderCode: string;
  tableId: string;
  tableNumber: string;
  totalItemCount: number;
  totalEstimatedAmount: number;
  action: 'Placed' | 'ItemsAdded' | 'Modified';
  waiterName?: string;
  timestamp: string;
}
```

### 2.2. `BillRequested`
```typescript
export interface BillRequestedDto {
  tableId: string;
  tableNumber: string;
  orderId: string;
  orderCode: string;
  totalAmount: number;
  waiterName?: string;
  requestedTime: string;
}
```

### 2.3. `PaymentCompleted`
```typescript
export interface PaymentCompletedDto {
  orderId: string;
  orderCode: string;
  tableId: string;
  tableNumber: string;
  paidAmount: number;
  paymentMethod: 'CASH' | 'VIETQR';
  cashierName: string;
  completedTime: string;
}
```

---

## 3. Kiến trúc Đăng ký Lắng nghe Phía Frontend (Angular Implementation Pattern)

```typescript
// Trong CashierSyncService hoặc TableSignalrService
export class CashierSyncService {
  private readonly signalrService = inject(TableSignalrService);
  private readonly toaster = inject(ToasterService);
  private readonly audioService = inject(AudioNotificationService);

  public readonly orderPlaced$ = this.signalrService.on<OrderPlacedOrUpdatedDto>('OrderPlacedOrUpdated');
  public readonly billRequested$ = this.signalrService.on<BillRequestedDto>('BillRequested');
  public readonly paymentCompleted$ = this.signalrService.on<PaymentCompletedDto>('PaymentCompleted');

  constructor() {
    // 1. Khi Waiter gọi món mới -> Phát chuông báo và hiển thị Toast cho Cashier
    this.orderPlaced$.subscribe(evt => {
      this.audioService.playChime();
      this.toaster.info(`Bàn ${evt.tableNumber} vừa gọi thêm ${evt.totalItemCount} món mới`, 'Đơn hàng mới');
    });

    // 2. Khi Waiter yêu cầu tính tiền -> Báo động ưu tiên cao
    this.billRequested$.subscribe(evt => {
      this.audioService.playAlert();
      this.toaster.warn(`Bàn ${evt.tableNumber} yêu cầu thanh toán (${evt.totalAmount.toLocaleString()} đ)`, 'Yêu cầu tính tiền');
    });
  }
}
```
