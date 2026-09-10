using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>Draft and inactive fields must not receive generated proposals.</summary>
public static class ProposalEligibility
{
    public static bool CanReceiveProposals(FieldStatus status) =>
        status == FieldStatus.Active;

    public static bool IsEligible(FieldStatus status, out string? reason)
    {
        if (status == FieldStatus.Draft)
        {
            reason = "Draft fields do not receive task proposals.";
            return false;
        }

        if (status == FieldStatus.Archived)
        {
            reason = "Archived fields do not receive task proposals.";
            return false;
        }

        if (status is FieldStatus.NeedsBoundaryConfirmation or FieldStatus.NeedsAreaReview)
        {
            reason = "Fields that are not yet active do not receive task proposals.";
            return false;
        }

        reason = null;
        return true;
    }
}
