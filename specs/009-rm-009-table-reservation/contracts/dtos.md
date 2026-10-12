# Hợp đồng dịch vụ ứng dụng (DTO)

Các Data Transfer Objects (DTOs) dùng giao tiếp giữa frontend (Angular) và backend API. Nằm ở layer `Acme.TooHungry.Application.Contracts`.

## Tạo Đặt chỗDto
Dùng để tạo mới đơn đặt bàn (từ khách hàng).

```csharp
public class CreateReservationDto
{
    [Required]
    [StringLength(100)]
    public string CustomerName { get; set; }

    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; }

    [Required]
    [Range(1, 100)]
    public int GuestCount { get; set; }

    [Required]
    public DateTime ReservationTime { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}
```

## Đặt chỗDto
Dùng để trả về thông tin đơn đặt bàn cho client. Kế thừa `AuditedEntityDto<Guid>`.

```csharp
public class ReservationDto : AuditedEntityDto<Guid>
{
    public string CustomerName { get; set; }
    public string PhoneNumber { get; set; }
    public int GuestCount { get; set; }
    public DateTime ReservationTime { get; set; }
    public ReservationStatus Status { get; set; }
    public string? Note { get; set; }
    public Guid? TableId { get; set; }
}
```

## Cập nhậtReservationStatusDto
Dùng cho lễ tân thay đổi trạng thái (Xác nhận, Hủy, Nhận bàn).

```csharp
public class UpdateReservationStatusDto
{
    [Required]
    public ReservationStatus Status { get; set; }
    
    // Yêu cầu nếu Status là Confirmed
    public Guid? TableId { get; set; } 
}
```
