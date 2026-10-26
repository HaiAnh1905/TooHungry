using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Acme.TooHungry.Controllers;
using Microsoft.AspNetCore.Http;
using Shouldly;
using Volo.Abp;
using Xunit;

namespace Acme.TooHungry.Security;

public class ImageFileValidator_Tests
{
    private static IFormFile CreateFormFile(byte[] content, string fileName, string contentType)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    [Fact]
    public async Task ValidateAsync_Should_Throw_When_File_Is_Null_Or_Empty()
    {
        var ex1 = await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(null);
        });
        ex1.Message.ShouldContain("FileRequired");

        var emptyFile = CreateFormFile([], "empty.jpg", "image/jpeg");
        var ex2 = await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(emptyFile);
        });
        ex2.Message.ShouldContain("FileRequired");
    }

    [Fact]
    public async Task ValidateAsync_Should_Throw_When_FileSize_Exceeds_5MB()
    {
        var largeContent = new byte[5 * 1024 * 1024 + 1];
        var largeFile = CreateFormFile(largeContent, "large.jpg", "image/jpeg");

        var ex = await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(largeFile);
        });

        ex.Message.ShouldContain("FileSizeExceeded");
    }

    [Theory]
    [InlineData("script.bin")]
    [InlineData("config.dat")]
    [InlineData("program.dll")]
    [InlineData("document.pdf")]
    [InlineData("archive.zip")]
    public async Task ValidateAsync_Should_Throw_When_Extension_Not_Whitelisted(string fileName)
    {
        var content = Encoding.UTF8.GetBytes("sample unwhitelisted content");
        var file = CreateFormFile(content, fileName, "image/jpeg");

        var ex = await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });

        ex.Message.ShouldContain("InvalidFileType");
    }

    [Fact]
    public async Task ValidateAsync_Should_Throw_When_MimeType_Is_Not_Image()
    {
        var content = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00 };
        var file = CreateFormFile(content, "image.jpg", "application/octet-stream");

        var ex = await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });

        ex.Message.ShouldContain("InvalidFileType");
    }

    [Theory]
    [InlineData("spoofed.jpg", "image/jpeg")]
    [InlineData("spoofed.png", "image/png")]
    [InlineData("spoofed.gif", "image/gif")]
    [InlineData("spoofed.webp", "image/webp")]
    public async Task ValidateAsync_Should_Throw_When_MagicBytes_Spoofed(string fileName, string mime)
    {
        var textContent = Encoding.UTF8.GetBytes("This is plain text content without valid image magic bytes header.");
        var file = CreateFormFile(textContent, fileName, mime);

        var ex = await Should.ThrowAsync<UserFriendlyException>(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });

        ex.Message.ShouldContain("InvalidFileSignature");
    }

    [Fact]
    public async Task ValidateAsync_Should_Succeed_For_Valid_Jpeg()
    {
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46 };
        var file = CreateFormFile(jpegBytes, "dish.jpg", "image/jpeg");

        await Should.NotThrowAsync(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });
    }

    [Fact]
    public async Task ValidateAsync_Should_Succeed_For_Valid_Png()
    {
        var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
        var file = CreateFormFile(pngBytes, "dish.png", "image/png");

        await Should.NotThrowAsync(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });
    }

    [Fact]
    public async Task ValidateAsync_Should_Succeed_For_Valid_Gif()
    {
        var gifBytes = new byte[] { 0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00 }; // GIF89a
        var file = CreateFormFile(gifBytes, "dish.gif", "image/gif");

        await Should.NotThrowAsync(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });
    }

    [Fact]
    public async Task ValidateAsync_Should_Succeed_For_Valid_Webp()
    {
        var webpBytes = new byte[]
        {
            0x52, 0x49, 0x46, 0x46, // "RIFF"
            0x24, 0x00, 0x00, 0x00, // file size
            0x57, 0x45, 0x42, 0x50  // "WEBP"
        };
        var file = CreateFormFile(webpBytes, "dish.webp", "image/webp");

        await Should.NotThrowAsync(async () =>
        {
            await SafeImageFileValidator.ValidateAsync(file);
        });
    }
}
