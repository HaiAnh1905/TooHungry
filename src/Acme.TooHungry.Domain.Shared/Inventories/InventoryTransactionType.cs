namespace Acme.TooHungry.Inventories;

public enum InventoryTransactionType
{
    IN = 1,             // Nhập kho (từ phiếu mua hàng / nhà cung cấp)
    OUT = 2,            // Xuất kho (tiêu hao tự động theo Recipe qua POS hoặc xuất hủy)
    ADJUSTMENT_IN = 3,  // Điều chỉnh tăng khi kiểm kê thực tế thừa
    ADJUSTMENT_OUT = 4  // Điều chỉnh giảm khi kiểm kê thực tế thiếu hụt / hư hỏng
}
