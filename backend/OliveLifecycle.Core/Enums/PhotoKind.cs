namespace OliveLifecycle.Core.Enums;

public enum PhotoKind
{
    General,
    Before,
    After,
    BoundaryVertex
}

public static class PhotoKindExtensions
{
    public static string ToApiString(this PhotoKind kind) => kind switch
    {
        PhotoKind.Before => "before",
        PhotoKind.After => "after",
        PhotoKind.BoundaryVertex => "boundaryVertex",
        _ => "general"
    };

    public static PhotoKind FromApiString(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "before" => PhotoKind.Before,
            "after" => PhotoKind.After,
            "boundaryvertex" or "boundary_vertex" or "boundary-vertex" => PhotoKind.BoundaryVertex,
            _ => PhotoKind.General
        };
}
