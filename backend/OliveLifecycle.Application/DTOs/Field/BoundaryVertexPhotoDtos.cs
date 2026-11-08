namespace OliveLifecycle.Application.DTOs.Field;

public class BoundaryVertexPhotoDto
{
    public string PhotoId { get; set; } = string.Empty;
    public int VertexIndex { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class AssignBoundaryVertexPhotoRequest
{
    public string PhotoId { get; set; } = string.Empty;
}
