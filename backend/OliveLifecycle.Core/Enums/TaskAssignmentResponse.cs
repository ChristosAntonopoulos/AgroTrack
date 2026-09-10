namespace OliveLifecycle.Core.Enums;

public enum TaskAssignmentResponse
{
    Pending,
    Accepted,
    Declined
}

public static class TaskAssignmentResponseExtensions
{
    public static string ToApiString(this TaskAssignmentResponse response) => response switch
    {
        TaskAssignmentResponse.Accepted => "accepted",
        TaskAssignmentResponse.Declined => "declined",
        _ => "pending"
    };

    public static TaskAssignmentResponse FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "accepted" => TaskAssignmentResponse.Accepted,
        "declined" => TaskAssignmentResponse.Declined,
        _ => TaskAssignmentResponse.Pending
    };
}
