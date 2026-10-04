namespace OliveLifecycle.Application.Abstractions.Imaging;

public interface IImageMetadataService
{
    Task<ImageProcessingResult> ProcessAsync(Stream content, CancellationToken cancellationToken = default);
}

public sealed class ImageProcessingResult
{
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public DateTime? CapturedAtUtc { get; init; }
    public int? Width { get; init; }
    public int? Height { get; init; }
    public int? Orientation { get; init; }
    public required byte[] OriginalBytes { get; init; }
    public required byte[] ThumbnailBytes { get; init; }
    public string ThumbnailContentType { get; init; } = "image/jpeg";
}
