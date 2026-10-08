namespace OliveLifecycle.Core.Enums;

public enum TaskSource
{
    Custom,
    Template
}

public static class TaskSourceExtensions
{
    public static string ToApiString(this TaskSource source) => source switch
    {
        TaskSource.Template => "template",
        _ => "custom"
    };

    public static TaskSource? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "template" => TaskSource.Template,
        "custom" => TaskSource.Custom,
        _ => null
    };
}
