using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Jpeg;
using OliveLifecycle.Infrastructure.Imaging;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Imaging;

public class ImageMetadataServiceTests
{
    private readonly ImageMetadataService _sut = new();

    [Fact]
    public async Task ProcessAsync_PlainJpeg_ProducesThumbnailAndDimensions()
    {
        await using var input = await CreateJpegAsync(640, 480);

        var result = await _sut.ProcessAsync(input);

        Assert.Equal(640, result.Width);
        Assert.Equal(480, result.Height);
        Assert.Null(result.Latitude);
        Assert.Null(result.Longitude);
        Assert.True(result.OriginalBytes.Length > 0);
        Assert.True(result.ThumbnailBytes.Length > 0);
        Assert.True(result.ThumbnailBytes.Length < result.OriginalBytes.Length);
    }

    [Fact]
    public async Task ProcessAsync_LargeImage_ThumbnailFitsLongEdge()
    {
        await using var input = await CreateJpegAsync(1200, 800);

        var result = await _sut.ProcessAsync(input);

        await using var thumbStream = new MemoryStream(result.ThumbnailBytes);
        using var thumb = await Image.LoadAsync(thumbStream);
        Assert.True(Math.Max(thumb.Width, thumb.Height) <= 400);
    }

    private static async Task<MemoryStream> CreateJpegAsync(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height);
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                image[x, y] = new Rgba32((byte)(x % 255), (byte)(y % 255), 120);
            }
        }

        var stream = new MemoryStream();
        await image.SaveAsJpegAsync(stream, new JpegEncoder { Quality = 90 });
        stream.Position = 0;
        return stream;
    }
}
