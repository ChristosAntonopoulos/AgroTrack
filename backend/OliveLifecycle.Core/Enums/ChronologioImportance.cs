namespace OliveLifecycle.Core.Enums;

public enum ChronologioImportance
{
    Normal,
    Important,
    Warning,
    Critical,
    Positive
}

public static class ChronologioImportanceExtensions
{
    public static string ToApiString(this ChronologioImportance importance) => importance switch
    {
        ChronologioImportance.Important => "important",
        ChronologioImportance.Warning => "warning",
        ChronologioImportance.Critical => "critical",
        ChronologioImportance.Positive => "positive",
        _ => "normal"
    };

    public static ChronologioImportance FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "important" => ChronologioImportance.Important,
        "warning" => ChronologioImportance.Warning,
        "critical" => ChronologioImportance.Critical,
        "positive" => ChronologioImportance.Positive,
        _ => ChronologioImportance.Normal
    };
}
