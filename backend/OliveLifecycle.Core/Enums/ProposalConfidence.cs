namespace OliveLifecycle.Core.Enums;

/// <summary>User-facing confidence bands. Never expose decimals.</summary>
public enum ProposalConfidence
{
    StrongEvidence,
    WorthChecking,
    SeasonalReminder
}

public static class ProposalConfidenceExtensions
{
    public static string ToApiString(this ProposalConfidence confidence) => confidence switch
    {
        ProposalConfidence.StrongEvidence => "strong_evidence",
        ProposalConfidence.WorthChecking => "worth_checking",
        _ => "seasonal_reminder"
    };

    public static ProposalConfidence? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "strong_evidence" => ProposalConfidence.StrongEvidence,
        "worth_checking" => ProposalConfidence.WorthChecking,
        "seasonal_reminder" => ProposalConfidence.SeasonalReminder,
        _ => null
    };
}
