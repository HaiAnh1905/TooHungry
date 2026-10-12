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
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    private const long MaxFileSizeInBytes = 5 * 1024 * 1024; // 5MB

    public MediaController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Tải hình ảnh món ăn lên máy chủ CDN Cloudinary
    /// </summary>
    /// <param name="file">File ảnh được chọn từ máy tính</param>
    /// <returns>Đối tượng JSON chứa URL hình ảnh an toàn (SecureUrl) từ Cloudinary</returns>
    [HttpPost("upload-dish-image")]
    public virtual async Task<IActionResult> UploadDishImageAsync(IFormFile file)
    {
        
        // 1. Kiểm tra tính hợp lệ của file upload
        if (file == null || file.Length == 0)
        {
            throw new UserFriendlyException("Vui lòng chọn một file ảnh hợp lệ để tải lên!");
        }

        if (file.Length > MaxFileSizeInBytes)
        {
            throw new UserFriendlyException("Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB)!");
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
        {
            throw new UserFriendlyException("Định dạng file không được hỗ trợ! Vui lòng chọn ảnh JPG, JPEG, PNG, WEBP hoặc GIF.");
        }

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
            throw new UserFriendlyException("Hệ thống chưa được cấu hình thông tin tài khoản Cloudinary. Vui lòng kiểm tra lại file .env hoặc cấu hình ứng dụng!");
        }

        cloudinary.Api.Secure = true;

        // 3. Tiến hành tải ảnh lên Cloudinary vào thư mục toohungry/dishes
        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = "toohungry/dishes",
            UseFilename = false,
            UniqueFilename = true,
            Overwrite = false,
            Transformation = new Transformation().Quality("auto").FetchFormat("auto")
        };

        var uploadResult = await cloudinary.UploadAsync(uploadParams);

        if (uploadResult.Error != null)
        {
            throw new UserFriendlyException($"Tải ảnh lên Cloudinary không thành công: {uploadResult.Error.Message}");
        }

        // 4. Trả về URL HTTPS của ảnh vừa upload
        return Ok(new
        {
            url = uploadResult.SecureUrl.ToString()
        });
    }
}

