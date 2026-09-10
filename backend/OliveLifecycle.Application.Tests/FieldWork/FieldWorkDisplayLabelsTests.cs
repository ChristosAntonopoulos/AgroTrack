using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkDisplayLabelsTests
{
    [Theory]
    [InlineData(FieldTaskStatus.Planned, "Προγραμματισμένη", "Planned")]
    [InlineData(FieldTaskStatus.Ready, "Έτοιμη", "Ready")]
    [InlineData(FieldTaskStatus.InProgress, "Σε εξέλιξη", "In progress")]
    [InlineData(FieldTaskStatus.Blocked, "Δεν μπορεί να γίνει", "Blocked")]
    [InlineData(FieldTaskStatus.Completed, "Ολοκληρώθηκε", "Completed")]
    [InlineData(FieldTaskStatus.Cancelled, "Ακυρώθηκε", "Cancelled")]
    public void TaskStatus_UsesGreekAndEnglishLabels(FieldTaskStatus status, string el, string en)
    {
        Assert.Equal(el, FieldWorkDisplayLabels.ForTaskStatus(status, "el"));
        Assert.Equal(en, FieldWorkDisplayLabels.ForTaskStatus(status, "en"));
        Assert.DoesNotContain("FieldTaskStatus", FieldWorkDisplayLabels.ForTaskStatus(status, "el"));
    }

    [Fact]
    public void ProposedStatus_IsGreekProposal()
    {
        Assert.Equal("Πρόταση", FieldWorkDisplayLabels.ProposedStatus("el"));
        Assert.Equal("Proposed", FieldWorkDisplayLabels.ProposedStatus("en"));
    }

    [Theory]
    [InlineData(ProposalConfidence.StrongEvidence, "Ισχυρή ένδειξη", "Strong evidence")]
    [InlineData(ProposalConfidence.WorthChecking, "Χρειάζεται έλεγχο", "Worth checking")]
    [InlineData(ProposalConfidence.SeasonalReminder, "Εποχική υπενθύμιση", "Seasonal reminder")]
    public void Confidence_NeverExposesDecimals(ProposalConfidence confidence, string el, string en)
    {
        Assert.Equal(el, FieldWorkDisplayLabels.ForConfidence(confidence, "el"));
        Assert.Equal(en, FieldWorkDisplayLabels.ForConfidence(confidence, "en"));
        Assert.DoesNotContain(".", FieldWorkDisplayLabels.ForConfidence(confidence, "el"));
        Assert.DoesNotContain("0.", FieldWorkDisplayLabels.ForConfidence(confidence, "en"));
    }

    [Fact]
    public void Decisions_UseGreekActionLabels()
    {
        Assert.Equal("Προγραμμάτισέ την", FieldWorkDisplayLabels.ForProposalDecision(TaskProposalDecision.Accept, "el"));
        Assert.Equal("Θύμισέ μου αργότερα", FieldWorkDisplayLabels.ForProposalDecision(TaskProposalDecision.RemindLater, "el"));
        Assert.Equal("Δεν αφορά αυτό το χωράφι", FieldWorkDisplayLabels.ForProposalDecision(TaskProposalDecision.NotForThisField, "el"));
        Assert.Equal("Όχι φέτος", FieldWorkDisplayLabels.ForProposalDecision(TaskProposalDecision.DismissForYear, "el"));
    }

    [Theory]
    [InlineData(PreferenceMode.Unknown, "Άγνωστο", "Unknown")]
    [InlineData(PreferenceMode.Enabled, "Ενεργό", "Enabled")]
    [InlineData(PreferenceMode.AskFirst, "Ρώτα πρώτα", "Ask first")]
    public void PreferenceMode_UsesHumanLabels(PreferenceMode mode, string el, string en)
    {
        Assert.Equal(el, FieldWorkDisplayLabels.ForPreferenceMode(mode, "el"));
        Assert.Equal(en, FieldWorkDisplayLabels.ForPreferenceMode(mode, "en"));
        Assert.DoesNotContain("PreferenceMode", FieldWorkDisplayLabels.ForPreferenceMode(mode, "el"));
    }

    [Theory]
    [InlineData(FrequencyType.EveryNYears, "Κάθε N χρόνια", "Every N years")]
    [InlineData(FrequencyType.EvidenceOnly, "Μόνο με ένδειξη", "Only with evidence")]
    [InlineData(FrequencyType.Unknown, "Άγνωστο", "Unknown")]
    public void FrequencyType_UsesHumanLabels(FrequencyType type, string el, string en)
    {
        Assert.Equal(el, FieldWorkDisplayLabels.ForFrequencyType(type, "el"));
        Assert.Equal(en, FieldWorkDisplayLabels.ForFrequencyType(type, "en"));
    }

    [Theory]
    [InlineData(TemplateEligibilityStatus.Suppressed, "Δεν προτείνεται", "Not proposed")]
    [InlineData(TemplateEligibilityStatus.AskFirst, "Ρώτα πρώτα", "Ask first")]
    [InlineData(TemplateEligibilityStatus.Enabled, "Προτείνεται", "Proposed")]
    public void TemplateEligibility_UsesHumanLabels(TemplateEligibilityStatus status, string el, string en)
    {
        Assert.Equal(el, FieldWorkDisplayLabels.ForTemplateEligibility(status, "el"));
        Assert.Equal(en, FieldWorkDisplayLabels.ForTemplateEligibility(status, "en"));
        Assert.DoesNotContain("TemplateEligibility", FieldWorkDisplayLabels.ForTemplateEligibility(status, "el"));
    }
}
