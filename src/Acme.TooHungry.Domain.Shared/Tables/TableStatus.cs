namespace Acme.TooHungry.Tables;

public enum TableStatus
{
    Available = 0,   // Bàn trống, sẵn sàng đón khách
    Occupied = 1,    // Đang có khách ngồi
    Reserved = 2,    // Đã đặt trước
    Disabled = 3,    // Tạm ngưng / Bàn hỏng / Bảo trì / Không khả dụng
    Cleaning = 4     // Đang dọn dẹp sau khi khách thanh toán
}
