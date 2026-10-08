namespace OliveLifecycle.Core.Enums;

/// <summary>
/// Task lifecycle statuses. Only planned / done / skipped are user-facing.
/// Legacy Mongo values are mapped in <see cref="FieldTaskStatusExtensions.FromApiString"/>.
/// </summary>
public enum FieldTaskStatus
{
    Planned,
    Done,
    Skipped
}

public static class FieldTaskStatusExtensions
{
    public static string ToApiString(this FieldTaskStatus status) => status switch
    {
        FieldTaskStatus.Done => "done",
        FieldTaskStatus.Skipped => "skipped",
        _ => "planned"
    };

    public static FieldTaskStatus? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "planned" or "ready" or "in_progress" or "blocked" => FieldTaskStatus.Planned,
        "done" or "completed" => FieldTaskStatus.Done,
        "skipped" or "cancelled" => FieldTaskStatus.Skipped,
        _ => null
    };

    public static bool IsOpen(this FieldTaskStatus status) => status == FieldTaskStatus.Planned;

    public static bool IsTerminal(this FieldTaskStatus status) =>
        status is FieldTaskStatus.Done or FieldTaskStatus.Skipped;
}
