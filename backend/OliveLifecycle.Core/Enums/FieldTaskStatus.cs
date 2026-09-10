namespace OliveLifecycle.Core.Enums;

public enum FieldTaskStatus
{
    Planned,
    Ready,
    InProgress,
    Blocked,
    Completed,
    Cancelled
}

public static class FieldTaskStatusExtensions
{
    public static string ToApiString(this FieldTaskStatus status) => status switch
    {
        FieldTaskStatus.Ready => "ready",
        FieldTaskStatus.InProgress => "in_progress",
        FieldTaskStatus.Blocked => "blocked",
        FieldTaskStatus.Completed => "completed",
        FieldTaskStatus.Cancelled => "cancelled",
        _ => "planned"
    };

    public static FieldTaskStatus? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "planned" => FieldTaskStatus.Planned,
        "ready" => FieldTaskStatus.Ready,
        "in_progress" => FieldTaskStatus.InProgress,
        "blocked" => FieldTaskStatus.Blocked,
        "completed" => FieldTaskStatus.Completed,
        "cancelled" => FieldTaskStatus.Cancelled,
        _ => null
    };
}
