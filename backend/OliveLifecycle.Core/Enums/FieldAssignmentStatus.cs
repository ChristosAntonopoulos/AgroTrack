namespace OliveLifecycle.Core.Enums;

public enum FieldAssignmentStatus
{
    AutoMatched,
    Manual,
    NeedsReview,
    Unassigned
}

public static class FieldAssignmentStatusExtensions
{
    public static string ToApiString(this FieldAssignmentStatus status) => status switch
    {
        FieldAssignmentStatus.AutoMatched => "autoMatched",
        FieldAssignmentStatus.Manual => "manual",
        FieldAssignmentStatus.NeedsReview => "needsReview",
        FieldAssignmentStatus.Unassigned => "unassigned",
        _ => "unassigned"
    };

    public static FieldAssignmentStatus? FromApiString(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToLowerInvariant() switch
            {
                "automatched" or "auto_matched" or "auto-matched" => FieldAssignmentStatus.AutoMatched,
                "manual" => FieldAssignmentStatus.Manual,
                "needsreview" or "needs_review" or "needs-review" => FieldAssignmentStatus.NeedsReview,
                "unassigned" => FieldAssignmentStatus.Unassigned,
                _ => null
            };
}
