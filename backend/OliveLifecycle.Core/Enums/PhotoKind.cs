namespace OliveLifecycle.Core.Enums;

public enum PhotoKind
{
    General,
    Before,
    After
}

public static class PhotoKindExtensions
{
    public static string ToApiString(this PhotoKind kind) => kind switch
    {
        PhotoKind.Before => "before",
        PhotoKind.After => "after",
        _ => "general"
    };

    public static PhotoKind FromApiString(string? value) =>
        value?.Trim().ToLowerInvariant() switch
        {
            "before" => PhotoKind.Before,
            "after" => PhotoKind.After,
            _ => PhotoKind.General
        };
}
