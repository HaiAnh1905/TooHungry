# Thiết kế Mô hình Dữ liệu & Phân quyền (Data & Permission Model): RM-023

**Tính năng**: `RM-023`  
**Ngày**: 2026-10-23  
**Trạng thái**: Hoàn thành (Phase 1 Complete)

---

## 1. Mô hình Phân quyền Hệ thống (ABP Permission Model)

Hệ thống sử dụng cơ chế Phân quyền Hạt nhân (Granular Permission-Based Authorization) của ABP Framework. Mọi tài nguyên nghiệp vụ đều được kiểm soát bởi các định danh quyền hạn duy nhất kế thừa tiền tố `TooHungry`.

### 1.1 Ma trận Nhóm Quyền Hạt nhân (Granular Permission Matrix)

| Nhóm Quyền (Permission Group) | Mã Quyền Định danh (Constant) | Mô tả Nghiệp vụ | Phân bổ Vai trò Mặc định |
|---|---|---|---|
| **Dishes** | `TooHungry.Dishes.Default` | Xem danh sách món ăn, thực đơn ngày | Waiter, Cashier, Kitchen, Manager, Admin |
| | `TooHungry.Dishes.Create` | Thêm món ăn mới vào thực đơn | Manager, Admin |
| | `TooHungry.Dishes.Edit` | Chỉnh sửa thông tin món, tải ảnh món ăn | Manager, Admin |
| | `TooHungry.Dishes.Delete` | Xóa món ăn khỏi thực đơn | Manager, Admin |
| **DishCategories** | `TooHungry.DishCategories.Default` | Xem danh mục món ăn | Waiter, Cashier, Kitchen, Manager, Admin |
| | `TooHungry.DishCategories.Create` | Tạo mới danh mục món ăn | Manager, Admin |
| | `TooHungry.DishCategories.Edit` | Cập nhật tên, thứ tự danh mục | Manager, Admin |
| | `TooHungry.DishCategories.Delete` | Xóa danh mục món ăn | Manager, Admin |
| **Orders** | `TooHungry.Orders.Default` | Xem danh sách đơn hàng, xem đơn active của bàn | Waiter, Cashier, Kitchen, Manager, Admin |
| | `TooHungry.Orders.Create` | Tạo đơn hàng mới cho bàn | Waiter, Cashier, Manager, Admin |
| | `TooHungry.Orders.Edit` | Thêm món, ghi chú, hoàn tất đơn bàn ăn | Waiter, Cashier, Manager, Admin |
| | `TooHungry.Orders.Cancel` | Hủy đơn hàng đang phục vụ | Cashier, Manager, Admin |
| | `TooHungry.Orders.Delete` | Xóa vĩnh viễn đơn hàng | Admin |
| **Tables** | `TooHungry.Tables.Default` | Xem sơ đồ bàn ăn, theo dõi trạng thái bàn | Waiter, Cashier, Manager, Admin |
| | `TooHungry.Tables.Create` | Thêm bàn ăn mới vào sơ đồ | Manager, Admin |
| | `TooHungry.Tables.Edit` | Sửa thông tin bàn ăn, sức chứa | Manager, Admin |
| | `TooHungry.Tables.Delete` | Xóa bàn ăn | Manager, Admin |
| | `TooHungry.Tables.UpdateStatus` | Chuyển đổi trạng thái bàn (Đón khách, Dọn dẹp) | Waiter, Cashier, Manager, Admin |
| **DiningAreas** | `TooHungry.DiningAreas.Default` | Xem danh sách khu vực | Waiter, Cashier, Manager, Admin |
| | `TooHungry.DiningAreas.Create` | Tạo khu vực ẩm thực mới | Manager, Admin |
| | `TooHungry.DiningAreas.Edit` | Sửa thông tin khu vực | Manager, Admin |
| | `TooHungry.DiningAreas.Delete` | Xóa khu vực | Manager, Admin |
| **Recipes** | `TooHungry.Recipes.Default` | Xem công thức, định lượng nguyên liệu món | Kitchen, Manager, Admin |
| | `TooHungry.Recipes.Create` | Tạo công thức món ăn mới | Manager, Admin |
| | `TooHungry.Recipes.Edit` | Sửa định lượng, đổi đơn vị công thức | Manager, Admin |
| | `TooHungry.Recipes.Delete` | Xóa công thức | Manager, Admin |
| **Inventories** | `TooHungry.Inventories.Default` / `View` | Xem tồn kho, danh mục nguyên liệu | InventoryKeeper, Manager, Admin |
| | `TooHungry.Inventories.Batch` | Tạo lô nhập kho mới | InventoryKeeper, Manager, Admin |
| | `TooHungry.Inventories.Adjust` | Kiểm kê, điều chỉnh tăng/giảm tồn | InventoryKeeper, Manager, Admin |
| | `TooHungry.Inventories.Discard` | Xuất hủy lô hàng hỏng/quá hạn | InventoryKeeper, Manager, Admin |
| | `TooHungry.Inventories.DeactivateBatch` | Tạm ngưng / khóa lô hàng | InventoryKeeper, Manager, Admin |
| **Dashboard** | `TooHungry.Dashboard` | Xem Dashboard KPI doanh thu & báo cáo tổng quan | Manager, Admin |
| **Identity** | `AbpIdentity.Users.*` | Quản lý tài khoản người dùng | Admin |
| | `AbpIdentity.Roles.*` | Quản lý vai trò và phân quyền vai trò | Admin |

---

## 2. Mô hình Xác thực Tệp Tải lên & Magic Bytes (Safe File Upload Model)

### 2.1 Cấu trúc Dữ liệu Đầu vào (Upload Input DTO)
```csharp
namespace Acme.TooHungry.Controllers;

public class UploadDishImageInput
{
    [Required(ErrorMessage = "TooHungry:Security:FileRequired")]
    public IFormFile File { get; set; } = null!;
}
```

### 2.2 Bảng Chữ ký Nhị phân (Magic Bytes Signatures)

| Định dạng Tệp | Phần mở rộng (Extension) | MIME Content-Type | Byte Signatures (Hex) | Offset | Quy tắc Xác thực |
|---|---|---|---|---|---|
| **JPEG / JPG** | `.jpg`, `.jpeg` | `image/jpeg` | `FF D8 FF` | 0 | 3 bytes đầu tiên khớp `0xFF 0xD8 0xFF` |
| **PNG** | `.png` | `image/png` | `89 50 4E 47` | 0 | 4 bytes đầu tiên khớp `0x89 0x50 0x4E 0x47` |
| **GIF** | `.gif` | `image/gif` | `47 49 46 38` | 0 | 4 bytes đầu tiên khớp ASCII `"GIF8"` |
| **WEBP** | `.webp` | `image/webp` | `52 49 46 46` và `57 42 50` | 0 và 8 | Offset 0-3 là `"RIFF"`, Offset 8-11 là `"WEBP"` |

### 2.3 Thuật toán Kiểm tra Chữ ký Nhị phân (C# Helper)
```csharp
public static class SafeImageFileValidator
{
    private static readonly Dictionary<string, List<byte[]>> MagicBytesMap = new()
    {
        { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".jpg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".png", new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47 } } },
        { ".gif", new List<byte[]> { new byte[] { 0x47, 0x49, 0x46, 0x38 } } },
    };

    public static async Task<bool> IsValidImageAsync(IFormFile file)
    {
        if (file == null || file.Length == 0 || file.Length > 5 * 1024 * 1024)
        {
            return false;
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext == ".webp")
        {
            if (file.Length < 12) return false;
            using var stream = file.OpenReadStream();
            var header = new byte[12];
            await stream.ReadExactlyAsync(header, 0, 12);
            return header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 // RIFF
                && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50; // WEBP
        }

        if (!MagicBytesMap.TryGetValue(ext, out var signatures))
        {
            return false;
        }

        var maxSignatureLength = signatures.Max(s => s.Length);
        using var readStream = file.OpenReadStream();
        var buffer = new byte[maxSignatureLength];
        await readStream.ReadExactlyAsync(buffer, 0, maxSignatureLength);

        return signatures.Any(sig => buffer.Take(sig.Length).SequenceEqual(sig));
    }
}
```

---

## 3. Mô hình Cấu hình Bí mật & Phân tầng Môi trường (Secrets Configuration Schema)

### 3.1 Cấu trúc Placeholder trong `appsettings.json` (An toàn cho Git)
```json
{
  "AuthServer": {
    "Authority": "https://localhost:44353",
    "RequireHttpsMetadata": true,
    "SwaggerClientId": "TooHungry_Swagger",
    "CertificatePassPhrase": "__CONFIGURE_VIA_ENV_OR_USER_SECRETS__"
  },
  "StringEncryption": {
    "DefaultPassPhrase": "__CONFIGURE_VIA_ENV_OR_USER_SECRETS__"
  }
}
```

### 3.2 Ánh xạ Nạp Bí mật theo Thứ tự Ưu tiên (Precedence Hierarchy)

```text
[Ưu tiên 1 - Cao nhất] Biến môi trường Hệ thống (Environment Variables)
   ├── AUTH_SERVER_CERTIFICATE_PASSPHRASE -> AuthServer:CertificatePassPhrase
   └── STRING_ENCRYPTION_DEFAULT_PASSPHRASE -> StringEncryption:DefaultPassPhrase
          ▲
[Ưu tiên 2] .NET User-Secrets (Chỉ áp dụng môi trường Development)
   └── dotnet user-secrets set "AuthServer:CertificatePassPhrase" "..."
          ▲
[Ưu tiên 3] tệp appsettings.secrets.json (Tùy chọn, nằm trong .gitignore)
          ▲
[Ưu tiên 4 - Mặc định] appsettings.json (Chứa placeholder an toàn)
```

---

## 4. Từ điển Quốc tế hóa & Thông điệp Bảo mật (I18N Localization)

### 4.1 Bản dịch Tiếng Việt (`vi.json`)
```json
{
  "TooHungry:Security:FileRequired": "Vui lòng chọn một tệp hình ảnh để tải lên.",
  "TooHungry:Security:FileSizeExceeded": "Dung lượng tệp vượt quá giới hạn cho phép (tối đa 5MB).",
  "TooHungry:Security:InvalidFileType": "Định dạng tệp không được hỗ trợ. Vui lòng chỉ tải ảnh định dạng JPG, PNG, WEBP hoặc GIF.",
  "TooHungry:Security:InvalidFileSignature": "Chữ ký nhị phân của tệp không khớp với định dạng hình ảnh hợp lệ. Tệp có dấu hiệu bị giả mạo.",
  "TooHungry:Security:CloudinaryNotConfigured": "Hệ thống chưa được cấu hình thông tin tài khoản Cloudinary hợp lệ.",
  "TooHungry:Security:ProductionSecretsMissing": "Máy chủ chưa được cấu hình đầy đủ CertificatePassPhrase hoặc DefaultPassPhrase cho môi trường Production."
}
```

### 4.2 Bản dịch Tiếng Anh (`en.json`)
```json
{
  "TooHungry:Security:FileRequired": "Please select an image file to upload.",
  "TooHungry:Security:FileSizeExceeded": "File size exceeds the allowed limit (maximum 5MB).",
  "TooHungry:Security:InvalidFileType": "Unsupported file format. Please upload JPG, PNG, WEBP, or GIF images only.",
  "TooHungry:Security:InvalidFileSignature": "Binary file signature does not match a valid image format. The file appears to be corrupted or spoofed.",
  "TooHungry:Security:CloudinaryNotConfigured": "Cloudinary account configuration is missing or incomplete.",
  "TooHungry:Security:ProductionSecretsMissing": "Required secrets CertificatePassPhrase or DefaultPassPhrase are missing for the Production environment."
}
```
