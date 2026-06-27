namespace OliveLifecycle.Core.Enums;

public enum ApprovalStatus
{
    NotRequired,
    Pending,
    Approved,
    Rejected
}

public static class ApprovalStatusExtensions
{
    public static string ToApiString(this ApprovalStatus status) => status switch
    {
        ApprovalStatus.NotRequired => "not_required",
        ApprovalStatus.Pending => "pending",
        ApprovalStatus.Approved => "approved",
        ApprovalStatus.Rejected => "rejected",
        _ => "not_required"
    };

    public static ApprovalStatus FromApiString(string? value) => value?.ToLowerInvariant() switch
    {
        "pending" => ApprovalStatus.Pending,
        "approved" => ApprovalStatus.Approved,
        "rejected" => ApprovalStatus.Rejected,
        _ => ApprovalStatus.NotRequired
    };
}
