namespace OliveLifecycle.Core.Enums;

public enum TaskProposalDecision
{
    Accept,
    RemindLater,
    NotForThisField,
    DismissForYear
}

public static class TaskProposalDecisionExtensions
{
    public static string ToApiString(this TaskProposalDecision decision) => decision switch
    {
        TaskProposalDecision.RemindLater => "remind_later",
        TaskProposalDecision.NotForThisField => "not_for_this_field",
        TaskProposalDecision.DismissForYear => "dismiss_for_year",
        _ => "accept"
    };

    public static TaskProposalDecision? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "accept" => TaskProposalDecision.Accept,
        "remind_later" => TaskProposalDecision.RemindLater,
        "not_for_this_field" => TaskProposalDecision.NotForThisField,
        "dismiss_for_year" => TaskProposalDecision.DismissForYear,
        _ => null
    };
}
