namespace OliveLifecycle.Core.Enums;

public enum WorkTaskStatus
{
    Pending,
    InProgress,
    Completed,
    Cancelled
}

public static class WorkTaskStatusExtensions
{
    public static string ToApiString(this WorkTaskStatus status) => status switch
    {
        WorkTaskStatus.Pending => "pending",
        WorkTaskStatus.InProgress => "in_progress",
        WorkTaskStatus.Completed => "completed",
        WorkTaskStatus.Cancelled => "cancelled",
        _ => "pending"
    };

    public static WorkTaskStatus FromApiString(string? value) => value?.ToLowerInvariant() switch
    {
        "pending" => WorkTaskStatus.Pending,
        "in_progress" => WorkTaskStatus.InProgress,
        "completed" => WorkTaskStatus.Completed,
        "cancelled" => WorkTaskStatus.Cancelled,
        _ => WorkTaskStatus.Pending
    };
}
