using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class ProposalEligibilityTests
{
    [Fact]
    public void DraftField_CannotReceiveProposals()
    {
        Assert.False(ProposalEligibility.CanReceiveProposals(FieldStatus.Draft));
        Assert.False(ProposalEligibility.IsEligible(FieldStatus.Draft, out var reason));
        Assert.Contains("Draft", reason!);
    }

    [Fact]
    public void ActiveField_CanReceiveProposals()
    {
        Assert.True(ProposalEligibility.CanReceiveProposals(FieldStatus.Active));
        Assert.True(ProposalEligibility.IsEligible(FieldStatus.Active, out var reason));
        Assert.Null(reason);
    }

    [Fact]
    public void ArchivedAndIncompleteFields_AreRejected()
    {
        Assert.False(ProposalEligibility.IsEligible(FieldStatus.Archived, out _));
        Assert.False(ProposalEligibility.IsEligible(FieldStatus.NeedsBoundaryConfirmation, out _));
        Assert.False(ProposalEligibility.IsEligible(FieldStatus.NeedsAreaReview, out _));
    }

    [Fact]
    public void DedupKey_IsStableForSameInputs()
    {
        var start = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 6, 7, 0, 0, 0, DateTimeKind.Utc);
        var a = ProposalDedupKey.Build("field-1", "T14", "weekly_check", start, end);
        var b = ProposalDedupKey.Build("field-1", "t14", "WEEKLY_CHECK", start, end);
        Assert.Equal(a, b);
    }
}
