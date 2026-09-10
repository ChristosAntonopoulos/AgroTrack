namespace OliveLifecycle.Core.Enums;

public enum TaskExecutionOutcome
{
    Completed,
    PartiallyCompleted,
    NotDone
}

public static class TaskExecutionOutcomeExtensions
{
    public static string ToApiString(this TaskExecutionOutcome outcome) => outcome switch
    {
        TaskExecutionOutcome.PartiallyCompleted => "partially_completed",
        TaskExecutionOutcome.NotDone => "not_done",
        _ => "completed"
    };

    public static TaskExecutionOutcome? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "completed" => TaskExecutionOutcome.Completed,
        "partially_completed" => TaskExecutionOutcome.PartiallyCompleted,
        "not_done" => TaskExecutionOutcome.NotDone,
        _ => null
    };
}
