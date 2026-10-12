namespace Acme.TooHungry.Ingredients;

public enum ConsumptionMethod
{
    RECIPE = 1, // Tiêu hao tự động theo công thức món ăn qua POS
    MANUAL = 2, // Tiêu hao thủ công qua kiểm kê định kỳ
    HYBRID = 3  // Kết hợp cả công thức và kiểm kê bù trừ
}
