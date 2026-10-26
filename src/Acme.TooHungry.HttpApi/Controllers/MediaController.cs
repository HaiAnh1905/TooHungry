using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.ComponentModel.DataAnnotations;
using Acme.TooHungry.Permissions;
using Volo.Abp;

namespace Acme.TooHungry.Controllers;

public class UploadImageInput
{
    [Required]
    public IFormFile File { get; set; } = null!;
}

[RemoteService]
[Route("api/app/media")]
public class MediaController : TooHungryController
{
    private readonly IConfiguration _configuration;

    public MediaController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Tải hình ảnh món ăn lên máy chủ CDN Cloudinary an toàn
    /// </summary>
    /// <param name="file">File ảnh được chọn từ máy tính</param>
    /// <returns>Đối tượng JSON chứa URL hình ảnh an toàn (SecureUrl) từ Cloudinary</returns>
    [HttpPost("upload-dish-image")]
    [Authorize(TooHungryPermissions.Dishes.Edit)]
    public virtual async Task<IActionResult> UploadDishImageAsync(IFormFile file)
    {
        // 1. Kiểm tra an toàn 3 lớp (Extension, MIME, Magic Bytes)
        await SafeImageFileValidator.ValidateAsync(file);

        // 2. Lấy thông tin cấu hình Cloudinary (từ Configuration hoặc Biến môi trường .env)
        var cloudName = _configuration["Cloudinary:CloudName"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
        var apiKey = _configuration["Cloudinary:ApiKey"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
        var apiSecret = _configuration["Cloudinary:ApiSecret"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");
        var cloudinaryUrl = _configuration["CLOUDINARY_URL"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_URL");

        Cloudinary cloudinary;
        if (!string.IsNullOrWhiteSpace(cloudinaryUrl))
        {
            cloudinary = new Cloudinary(cloudinaryUrl);
        }
        else if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            cloudinary = new Cloudinary(account);
        }
        else
        {
            throw new BusinessException("TooHungry:Security:CloudinaryNotConfigured");
        }

        cloudinary.Api.Secure = true;

        // 3. Tiến hành tải ảnh lên Cloudinary vào thư mục toohungry/dishes với tên GUID ngẫu nhiên duy nhất
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safeFileName = $"{Guid.NewGuid():N}{ext}";

        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(safeFileName, stream),
            Folder = "toohungry/dishes",
            UseFilename = false,
            UniqueFilename = true,
            Overwrite = false,
            Transformation = new Transformation().Quality("auto").FetchFormat("auto")
        };

        var uploadResult = await cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new BusinessException(TooHungryDomainErrorCodes.MediaUploadFailed).WithData("0", uploadResult.Error.Message);
        }

        // 4. Trả về URL HTTPS của ảnh vừa upload
        return Ok(new
        {
            url = uploadResult.SecureUrl.ToString()
        });
    }
}

