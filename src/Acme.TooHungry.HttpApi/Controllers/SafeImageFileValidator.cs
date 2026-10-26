using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Volo.Abp;

namespace Acme.TooHungry.Controllers;

public static class SafeImageFileValidator
{
    public const long MaxFileSizeInBytes = 5 * 1024 * 1024; // 5MB

    public static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif"
    };

    private static readonly Dictionary<string, List<byte[]>> MagicBytesMap = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".jpg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".png", new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47 } } },
        { ".gif", new List<byte[]> { new byte[] { 0x47, 0x49, 0x46, 0x38 } } }, // "GIF8"
    };

    /// <summary>
    /// Kiểm tra tính hợp lệ toàn diện của file ảnh:
    /// Lớp 1: Kiểm tra dung lượng (<= 5MB) và phần mở rộng thuộc whitelist (.jpg, .jpeg, .png, .webp, .gif)
    /// Lớp 2: Kiểm tra MIME Content-Type (phải có dạng image/*)
    /// Lớp 3: Kiểm tra Magic Bytes nhị phân chữ ký tệp
    /// Ném UserFriendlyException với mã lỗi chuẩn nếu không hợp lệ.
    /// </summary>
    public static async Task ValidateAsync(IFormFile? file)
    {
        if (file == null || file.Length == 0)
        {
            throw new UserFriendlyException("TooHungry:Security:FileRequired");
        }

        if (file.Length > MaxFileSizeInBytes)
        {
            throw new UserFriendlyException("TooHungry:Security:FileSizeExceeded");
        }

        var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
        {
            throw new UserFriendlyException("TooHungry:Security:InvalidFileType");
        }

        // Lớp 2: Kiểm tra MIME ContentType
        if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new UserFriendlyException("TooHungry:Security:InvalidFileType");
        }

        // Lớp 3: Kiểm tra Magic Bytes nhị phân
        await using var stream = file.OpenReadStream();
        var isValidSignature = await ValidateMagicBytesAsync(stream, ext, file.Length);
        if (!isValidSignature)
        {
            throw new UserFriendlyException("TooHungry:Security:InvalidFileSignature");
        }
    }

    /// <summary>
    /// Phương thức kiểm tra logic trả về boolean
    /// </summary>
    public static async Task<bool> IsValidImageAsync(IFormFile? file)
    {
        if (file == null || file.Length == 0 || file.Length > MaxFileSizeInBytes)
        {
            return false;
        }

        var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext) || !AllowedExtensions.Contains(ext))
        {
            return false;
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        await using var stream = file.OpenReadStream();
        return await ValidateMagicBytesAsync(stream, ext, file.Length);
    }

    /// <summary>
    /// Xác thực Magic Bytes từ Stream
    /// </summary>
    public static async Task<bool> ValidateMagicBytesAsync(Stream stream, string ext, long streamLength)
    {
        if (stream == null || streamLength == 0)
        {
            return false;
        }

        if (stream.CanSeek)
        {
            stream.Seek(0, SeekOrigin.Begin);
        }

        ext = ext.ToLowerInvariant();

        if (ext == ".webp")
        {
            if (streamLength < 12)
            {
                return false;
            }

            var header = new byte[12];
            var bytesRead = await stream.ReadAsync(header.AsMemory(0, 12));
            if (bytesRead < 12)
            {
                return false;
            }

            // RIFF header at offset 0-3 and WEBP at offset 8-11
            return header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 // 'R','I','F','F'
                && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50; // 'W','E','B','P'
        }

        if (!MagicBytesMap.TryGetValue(ext, out var signatures))
        {
            return false;
        }

        var maxSignatureLength = signatures.Max(s => s.Length);
        if (streamLength < maxSignatureLength)
        {
            return false;
        }

        var buffer = new byte[maxSignatureLength];
        var readCount = await stream.ReadAsync(buffer.AsMemory(0, maxSignatureLength));
        if (readCount < maxSignatureLength)
        {
            return false;
        }

        return signatures.Any(sig => buffer.Take(sig.Length).SequenceEqual(sig));
    }
}
