namespace OliveLifecycle.Core.Enums;

public enum TaskProposalStatus
{
    Active,
    Accepted,
    Snoozed,
    DismissedForField,
    DismissedForYear,
    Expired
}

public static class TaskProposalStatusExtensions
{
    public static string ToApiString(this TaskProposalStatus status) => status switch
    {
        TaskProposalStatus.Accepted => "accepted",
        TaskProposalStatus.Snoozed => "snoozed",
        TaskProposalStatus.DismissedForField => "dismissed_for_field",
        TaskProposalStatus.DismissedForYear => "dismissed_for_year",
        TaskProposalStatus.Expired => "expired",
        _ => "active"
    };

    public static TaskProposalStatus? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "active" => TaskProposalStatus.Active,
        "accepted" => TaskProposalStatus.Accepted,
        "snoozed" => TaskProposalStatus.Snoozed,
        "dismissed_for_field" => TaskProposalStatus.DismissedForField,
        "dismissed_for_year" => TaskProposalStatus.DismissedForYear,
        "expired" => TaskProposalStatus.Expired,
        _ => null
    };

    public static bool IsOpen(this TaskProposalStatus status) =>
        status is TaskProposalStatus.Active or TaskProposalStatus.Snoozed;
}
