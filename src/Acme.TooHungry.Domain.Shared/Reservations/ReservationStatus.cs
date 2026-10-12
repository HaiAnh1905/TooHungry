namespace Acme.TooHungry.Reservations;

public enum ReservationStatus
{
    Confirmed = 1,      // Đã xác nhận / Đang giữ chỗ (Bàn ở trạng thái RESERVED)
    Completed = 2,      // Khách đã đến nhận bàn (Bàn chuyển sang OCCUPIED)
    Cancelled = 3,      // Đã hủy thủ công bởi nhân viên/quản lý (Bàn chuyển về AVAILABLE)
    AutoCancelled = 4   // Hệ thống tự động hủy do quá hạn 1 giờ (Bàn chuyển về AVAILABLE)
}
