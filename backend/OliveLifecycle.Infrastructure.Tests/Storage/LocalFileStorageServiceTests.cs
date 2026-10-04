using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using OliveLifecycle.Infrastructure.Storage;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Storage;

public class LocalFileStorageServiceTests
{
    [Fact]
    public async Task OpenRead_AbsolutePublicBase_FindsFileSavedUnderUploadsRoot()
    {
        var root = NewRoot();
        try
        {
            var sut = Create(root, "https://api.example.com/uploads");
            var payload = new byte[] { 1, 2, 3, 4, 5, 6, 7 };

            await using var original = new MemoryStream(payload);
            await using var thumb = new MemoryStream(new byte[] { 8, 9 });
            var stored = await sut.SavePhotoAsync(original, thumb, "grove.jpg", "image/jpeg");

            Assert.StartsWith("https://api.example.com/uploads/photos/", stored.Url, StringComparison.Ordinal);

            await using var stream = await sut.OpenReadAsync(stored.Url);
            Assert.NotNull(stream);
            using var copy = new MemoryStream();
            await stream!.CopyToAsync(copy);
            Assert.Equal(payload, copy.ToArray());
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task OpenRead_RelativePublicBase_FindsFileSavedUnderUploadsRoot()
    {
        var root = NewRoot();
        try
        {
            var sut = Create(root, "/uploads");
            var payload = new byte[] { 9, 8, 7 };

            await using var original = new MemoryStream(payload);
            await using var thumb = new MemoryStream(new byte[] { 1 });
            var stored = await sut.SavePhotoAsync(original, thumb, "grove.jpg", "image/jpeg");

            Assert.StartsWith("/uploads/photos/", stored.Url, StringComparison.Ordinal);

            await using var stream = await sut.OpenReadAsync(stored.Url);
            Assert.NotNull(stream);
            using var copy = new MemoryStream();
            await stream!.CopyToAsync(copy);
            Assert.Equal(payload, copy.ToArray());
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    private static string NewRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), "olive-photos-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return root;
    }

    private static LocalFileStorageService Create(string root, string publicBase)
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c["Storage:LocalPath"]).Returns(root);
        config.Setup(c => c["Storage:PublicBasePath"]).Returns(publicBase);
        return new LocalFileStorageService(config.Object, NullLogger<LocalFileStorageService>.Instance);
    }
}
