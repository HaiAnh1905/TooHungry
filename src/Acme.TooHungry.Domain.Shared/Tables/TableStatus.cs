namespace Acme.TooHungry.Tables;

public enum TableStatus
{
    Available = 0,   // Bàn trống
    Occupied = 1,    // Đang có khách
    Reserved = 2,    // Đã đặt trước
    Disabled = 3     // Tạm ngưng / Bàn hỏng / Bảo trì
}
