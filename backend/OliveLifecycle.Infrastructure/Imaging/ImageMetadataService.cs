using MetadataExtractor;
using MetadataExtractor.Formats.Exif;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using OliveLifecycle.Application.Abstractions.Imaging;

namespace OliveLifecycle.Infrastructure.Imaging;

public class ImageMetadataService : IImageMetadataService
{
    private const int ThumbnailLongEdge = 400;

    public async Task<ImageProcessingResult> ProcessAsync(Stream content, CancellationToken cancellationToken = default)
    {
        await using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        var originalBytes = buffer.ToArray();

        double? latitude = null;
        double? longitude = null;
        DateTime? capturedAtUtc = null;
        int? orientation = null;

        try
        {
            using var metaStream = new MemoryStream(originalBytes, writable: false);
            var directories = ImageMetadataReader.ReadMetadata(metaStream);
            var gps = directories.OfType<GpsDirectory>().FirstOrDefault();
            if (gps != null)
            {
                var geo = gps.GetGeoLocation();
                if (geo != null && !geo.IsZero)
                {
                    latitude = geo.Latitude;
                    longitude = geo.Longitude;
                }
            }

            var exifSub = directories.OfType<ExifSubIfdDirectory>().FirstOrDefault();
            if (exifSub != null &&
                exifSub.TryGetDateTime(ExifDirectoryBase.TagDateTimeOriginal, out var original))
            {
                // EXIF has no timezone; treat as unspecified and store as UTC wall-clock.
                capturedAtUtc = DateTime.SpecifyKind(original, DateTimeKind.Utc);
            }

            var ifd0 = directories.OfType<ExifIfd0Directory>().FirstOrDefault();
            if (ifd0 != null && ifd0.TryGetInt32(ExifDirectoryBase.TagOrientation, out var orient))
            {
                orientation = orient;
            }
        }
        catch
        {
            // Metadata is best-effort; image bytes may still be valid.
        }

        int? width = null;
        int? height = null;
        byte[] thumbnailBytes;
        using (var imageStream = new MemoryStream(originalBytes, writable: false))
        using (var image = await Image.LoadAsync(imageStream, cancellationToken))
        {
            width = image.Width;
            height = image.Height;
            image.Mutate(ctx => ctx.AutoOrient());

            var longEdge = Math.Max(image.Width, image.Height);
            if (longEdge > ThumbnailLongEdge)
            {
                var scale = ThumbnailLongEdge / (double)longEdge;
                image.Mutate(ctx => ctx.Resize(
                    (int)Math.Round(image.Width * scale),
                    (int)Math.Round(image.Height * scale)));
            }

            await using var thumbStream = new MemoryStream();
            await image.SaveAsJpegAsync(thumbStream, new JpegEncoder { Quality = 82 }, cancellationToken);
            thumbnailBytes = thumbStream.ToArray();
        }

        return new ImageProcessingResult
        {
            Latitude = latitude,
            Longitude = longitude,
            CapturedAtUtc = capturedAtUtc,
            Width = width,
            Height = height,
            Orientation = orientation,
            OriginalBytes = originalBytes,
            ThumbnailBytes = thumbnailBytes
        };
    }
}
