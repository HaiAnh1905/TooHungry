using System;
using Volo.Abp;

namespace Acme.TooHungry.DiningAreas;

public class DiningAreaValidationException : UserFriendlyException
{
    public DiningAreaValidationException(string message) : base(message)
    {
    }

    public static DiningAreaValidationException NameRequired()
    {
        return new DiningAreaValidationException("Tên khu vực bàn ăn không được để trống!");
    }

    public static DiningAreaValidationException NameAlreadyExists(string name)
    {
        return new DiningAreaValidationException($"Khu vực bàn ăn '{name}' đã tồn tại!");
    }

    public static DiningAreaValidationException NotFound(Guid id)
    {
        return new DiningAreaValidationException($"Không tìm thấy khu vực bàn ăn với mã: {id}");
    }

    public static DiningAreaValidationException HasActiveOccupiedTables(string areaName, int tableCount)
    {
        return new DiningAreaValidationException($"Không thể vô hiệu hóa khu vực '{areaName}' vì có {tableCount} bàn đang có khách phục vụ!");
    }

    public static DiningAreaValidationException HardDeleteNotSupported()
    {
        return new DiningAreaValidationException("Hệ thống không hỗ trợ xóa cứng khu vực ăn uống. Vui lòng sử dụng tính năng Vô hiệu hóa khu vực!");
    }

    public static DiningAreaValidationException UnauthorizedManage()
    {
        return new DiningAreaValidationException("Bạn không có quyền quản lý trạng thái khu vực ăn uống!");
    }
}
