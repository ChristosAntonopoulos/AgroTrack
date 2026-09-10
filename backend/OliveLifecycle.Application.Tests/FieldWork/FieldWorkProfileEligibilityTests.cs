using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkProfileEligibilityTests
{
    private static readonly FieldWorkCatalogueEntry Pruning = FieldWorkCatalogue.GetByCode("T06")!;
    private static readonly FieldWorkCatalogueEntry IrrigationSchedule = FieldWorkCatalogue.GetByCode("T15")!;
    private static readonly FieldWorkCatalogueEntry IrrigationInspect = FieldWorkCatalogue.GetByCode("T08")!;
    private static readonly FieldWorkCatalogueEntry FertiliserApp = FieldWorkCatalogue.GetByCode("T05")!;
    private static readonly FieldWorkCatalogueEntry GroundCover = FieldWorkCatalogue.GetByCode("T09")!;
    private static readonly FieldWorkCatalogueEntry HarvestPrep = FieldWorkCatalogue.GetByCode("T19")!;
    private static readonly FieldWorkCatalogueEntry Monitoring = FieldWorkCatalogue.GetByCode("T14")!;

    [Fact]
    public void EveryTwoYearPruning_SuppressesInterveningYear()
    {
        var profile = ActiveProfile();
        profile.Pruning = new PruningProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.EveryNYears,
            FrequencyValue = 2,
            LastPerformedYear = 2025
        };

        var result = Eval(Pruning, profile, 2026, new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TemplateEligibilityStatus.Suppressed, result.Status);
        Assert.Equal(ReasonCodes.PruningNotDueThisYear, result.ReasonCode);
        Assert.Equal(2027, result.NextEligibleYear);
        Assert.Contains("κλάδεμα", result.GreekReason, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("EveryNYears", result.GreekReason);
        Assert.DoesNotContain("FrequencyType", result.EnglishReason);
    }

    [Fact]
    public void AnnualPruning_EligibleAfterOneYear()
    {
        var profile = ActiveProfile();
        profile.Pruning = new PruningProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.EveryNYears,
            FrequencyValue = 1,
            LastPerformedYear = 2025
        };

        var result = Eval(Pruning, profile, 2026, new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TemplateEligibilityStatus.Enabled, result.Status);
        Assert.Equal(ReasonCodes.PruningDueThisYear, result.ReasonCode);
        Assert.Equal(2027, result.NextEligibleYear);
    }

    [Fact]
    public void WhenNeededPruning_RequiresEvidence()
    {
        var profile = ActiveProfile();
        profile.Pruning = new PruningProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.WhenNeeded
        };

        var without = Eval(
            Pruning,
            profile,
            2026,
            new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc),
            source: ProposalSourceType.SeasonalBaseline);

        Assert.Equal(TemplateEligibilityStatus.Suppressed, without.Status);
        Assert.Equal(ReasonCodes.PruningNeedsEvidence, without.ReasonCode);

        var withEvidence = Eval(
            Pruning,
            profile,
            2026,
            new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc),
            source: ProposalSourceType.FieldObservation,
            observationEvidence: true);

        Assert.Equal(TemplateEligibilityStatus.Enabled, withEvidence.Status);
        Assert.Equal(ReasonCodes.PruningEvidencePresent, withEvidence.ReasonCode);
    }

    [Fact]
    public void RainFed_SuppressesRecurringIrrigationProposals()
    {
        var profile = ActiveProfile();
        profile.Irrigation = new IrrigationProfile
        {
            PreferenceMode = PreferenceMode.Disabled,
            Method = IrrigationMethod.Unknown
        };

        var schedule = Eval(IrrigationSchedule, profile, 2026, new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc));
        var inspect = Eval(IrrigationInspect, profile, 2026, new DateTime(2026, 4, 1, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TemplateEligibilityStatus.Suppressed, schedule.Status);
        Assert.Equal(ReasonCodes.IrrigationRainFed, schedule.ReasonCode);
        Assert.Equal(TemplateEligibilityStatus.Suppressed, inspect.Status);
        Assert.False(FieldWorkProfileEligibility.ResolveIsIrrigated(fieldIrrigationStatus: true, profile));
    }

    [Fact]
    public void EvidenceOnlyFertilisation_NoCalendarOnlyApplication()
    {
        var profile = ActiveProfile();
        profile.Fertilisation = new FertilisationProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.EvidenceOnly
        };

        var calendarOnly = Eval(
            FertiliserApp,
            profile,
            2026,
            new DateTime(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc),
            source: ProposalSourceType.SeasonalBaseline);

        Assert.Equal(TemplateEligibilityStatus.Suppressed, calendarOnly.Status);
        Assert.Equal(ReasonCodes.FertilisationNeedsEvidence, calendarOnly.ReasonCode);

        var withAnalysis = Eval(
            FertiliserApp,
            profile,
            2026,
            new DateTime(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc),
            source: ProposalSourceType.SeasonalBaseline,
            analysisEvidence: true);

        Assert.Equal(TemplateEligibilityStatus.Enabled, withAnalysis.Status);
    }

    [Fact]
    public void AnnualWeedCount_SubtractsCompleted_NeverNegative()
    {
        var profile = ActiveProfile();
        profile.GroundCover = new GroundCoverProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.TimesPerYear,
            FrequencyValue = 2
        };

        var remaining = Eval(
            GroundCover,
            profile,
            2026,
            new DateTime(2026, 5, 1, 12, 0, 0, DateTimeKind.Utc),
            completed: new Dictionary<string, int> { ["T09"] = 1 });

        Assert.Equal(TemplateEligibilityStatus.Enabled, remaining.Status);
        Assert.Equal(1, remaining.RemainingExpectedInstances);

        var exhausted = Eval(
            GroundCover,
            profile,
            2026,
            new DateTime(2026, 5, 1, 12, 0, 0, DateTimeKind.Utc),
            completed: new Dictionary<string, int> { ["T09"] = 5 });

        Assert.Equal(TemplateEligibilityStatus.Suppressed, exhausted.Status);
        Assert.Equal(0, exhausted.RemainingExpectedInstances);
        Assert.True(exhausted.RemainingExpectedInstances >= 0);
    }

    [Fact]
    public void CurrentYearCompletedWork_SuppressesDuplicates()
    {
        var profile = ActiveProfile();
        profile.Pruning = new PruningProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.EveryNYears,
            FrequencyValue = 1,
            LastPerformedYear = 2024
        };
        profile.CurrentYearDeclaredWork =
        [
            new CurrentYearDeclaredWorkItem
            {
                Category = "pruning",
                TemplateCode = "T06",
                ResultYear = 2026,
                Completion = DeclaredWorkCompletion.Yes
            }
        ];

        var result = Eval(Pruning, profile, 2026, new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TemplateEligibilityStatus.Suppressed, result.Status);
        Assert.Equal(ReasonCodes.AlreadyCompletedThisYear, result.ReasonCode);
    }

    [Fact]
    public void OfficialSafetyWarning_NotSuppressedByTreatmentPreference()
    {
        var profile = ActiveProfile();
        profile.PestManagement = new PestManagementProfile
        {
            PreferenceMode = PreferenceMode.Disabled,
            DecisionApproach = PestDecisionApproach.NoUsualTreatments
        };

        var treatment = new FieldWorkCatalogueEntry
        {
            Code = "TX_TREAT",
            GreekName = "Επέμβαση",
            EnglishName = "Treatment",
            Category = "Plant protection",
            IsPlantProtectionTreatment = true,
            Rules = []
        };

        var result = FieldWorkProfileEligibility.EvaluateTemplateForField(new TemplateEligibilityContext
        {
            Entry = treatment,
            FieldId = "field-1",
            Profile = profile,
            ResultYear = 2026,
            UtcNow = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc),
            CandidateSourceType = ProposalSourceType.OfficialWarning,
            TreatAsOfficialOrSafetyInformation = true,
            ActiveWarnings =
            [
                new OfficialAgriculturalWarning
                {
                    Id = "w1",
                    Title = "Safety",
                    TemplateCodes = ["TX_TREAT"],
                    FieldIds = ["field-1"],
                    IsActive = true
                }
            ]
        });

        Assert.Equal(TemplateEligibilityStatus.Enabled, result.Status);
        Assert.True(result.IsSafetyOrOfficialOverride);
        Assert.Equal(ReasonCodes.OfficialSafetyVisible, result.ReasonCode);
    }

    [Fact]
    public void SuppressedGenericTreatment_DoesNotSuppressOfficialInformation()
    {
        var profile = ActiveProfile();
        profile.PestManagement = new PestManagementProfile
        {
            DecisionApproach = PestDecisionApproach.NoUsualTreatments
        };

        var treatment = new FieldWorkCatalogueEntry
        {
            Code = "TX_TREAT",
            GreekName = "Επέμβαση",
            EnglishName = "Treatment",
            Category = "Plant protection",
            IsPlantProtectionTreatment = true,
            Rules =
            [
                new CatalogueRule
                {
                    RuleCode = "TX_SEASONAL",
                    GreekExplanation = "Εποχική επέμβαση",
                    EnglishExplanation = "Seasonal treatment",
                    SourceType = ProposalSourceType.SeasonalBaseline,
                    DefaultConfidence = ProposalConfidence.SeasonalReminder,
                    RequiresOfficialWarning = true
                }
            ]
        };

        var generic = FieldWorkProfileEligibility.EvaluateTemplateForField(new TemplateEligibilityContext
        {
            Entry = treatment,
            FieldId = "field-1",
            Profile = profile,
            ResultYear = 2026,
            UtcNow = new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc),
            CandidateSourceType = ProposalSourceType.SeasonalBaseline
        });

        Assert.Equal(TemplateEligibilityStatus.Suppressed, generic.Status);
        Assert.Equal(ReasonCodes.PestTreatmentSuppressed, generic.ReasonCode);

        // Monitoring / official info for T14 still enabled as information.
        var monitoring = Eval(
            Monitoring,
            profile,
            2026,
            new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc),
            source: ProposalSourceType.OfficialWarning,
            treatAsOfficial: true);

        Assert.Equal(TemplateEligibilityStatus.Enabled, monitoring.Status);
        Assert.True(monitoring.IsSafetyOrOfficialOverride);
    }

    [Fact]
    public void JanuaryHarvest_ResultYearAttachmentStillCorrect()
    {
        var taskDate = new DateTime(2027, 1, 5, 8, 0, 0, DateTimeKind.Utc);
        Assert.Equal(2026, ResultYearResolver.ForHarvestContinuation(taskDate, 2026));
        Assert.Equal(2026, ResultYearResolver.Resolve(taskDate, explicitResultYear: 2026, utcNow: taskDate));

        var profile = ActiveProfile();
        profile.Harvest = new HarvestProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            ExpectedStartMonth = 1
        };

        // Mid-December 2026 is within ~42 days of Jan 1 2027 for ResultYear 2026.
        var prep = Eval(
            HarvestPrep,
            profile,
            2026,
            new DateTime(2026, 12, 15, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(TemplateEligibilityStatus.Enabled, prep.Status);
        Assert.Equal(ReasonCodes.HarvestPrepInWindow, prep.ReasonCode);
    }

    [Fact]
    public void IntegrationFixture_ResultYear2026_SpecSection28()
    {
        var profile = ActiveProfile();
        profile.Irrigation = new IrrigationProfile { PreferenceMode = PreferenceMode.Disabled };
        profile.Pruning = new PruningProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.EveryNYears,
            FrequencyValue = 2,
            LastPerformedYear = 2025
        };
        profile.Fertilisation = new FertilisationProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.EvidenceOnly
        };
        profile.GroundCover = new GroundCoverProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            FrequencyType = FrequencyType.TimesPerYear,
            FrequencyValue = 2
        };
        profile.CurrentYearDeclaredWork =
        [
            new CurrentYearDeclaredWorkItem
            {
                Category = "ground_cover",
                TemplateCode = "T09",
                ResultYear = 2026,
                Completion = DeclaredWorkCompletion.Yes
            }
        ];
        profile.PestManagement = new PestManagementProfile
        {
            DecisionApproach = PestDecisionApproach.Agronomist
        };
        profile.Harvest = new HarvestProfile
        {
            PreferenceMode = PreferenceMode.Enabled,
            ExpectedStartMonth = 11
        };

        Assert.Equal(
            TemplateEligibilityStatus.Suppressed,
            Eval(IrrigationSchedule, profile, 2026, new DateTime(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc)).Status);
        Assert.Equal(
            TemplateEligibilityStatus.Suppressed,
            Eval(Pruning, profile, 2026, new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc)).Status);
        Assert.Equal(
            ReasonCodes.FertilisationNeedsEvidence,
            Eval(
                FertiliserApp,
                profile,
                2026,
                new DateTime(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc),
                source: ProposalSourceType.SeasonalBaseline).ReasonCode);

        var weeds = Eval(GroundCover, profile, 2026, new DateTime(2026, 5, 1, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(TemplateEligibilityStatus.Enabled, weeds.Status);
        Assert.Equal(1, weeds.RemainingExpectedInstances);

        var fly = Eval(Monitoring, profile, 2026, new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(TemplateEligibilityStatus.AskFirst, fly.Status);
        Assert.Equal(ReasonCodes.PestAgronomistDecision, fly.ReasonCode);
        Assert.Contains("γεωπόνο", fly.GreekReason, StringComparison.OrdinalIgnoreCase);

        // ~5 weeks before November → harvest prep eligible
        var prep = Eval(HarvestPrep, profile, 2026, new DateTime(2026, 9, 25, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(TemplateEligibilityStatus.Enabled, prep.Status);

        // Engine integration: rain-fed + profile suppress irrigation/pruning candidates in March.
        var context = new ProposalEvaluationContext
        {
            FieldId = "field-1",
            FieldStatus = FieldStatus.Active,
            IsIrrigated = FieldWorkProfileEligibility.ResolveIsIrrigated(false, profile),
            ResultYear = 2026,
            UtcNow = new DateTime(2026, 3, 10, 12, 0, 0, DateTimeKind.Utc),
            Phenology = FieldPhenologySnapshot.Unknown(),
            WorkProfile = profile,
            CompletedCountsByTemplate = new Dictionary<string, int>()
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        Assert.DoesNotContain(candidates, c => c.TemplateCode is "T08" or "T15" or "T06");
        Assert.DoesNotContain(candidates, c => c.TemplateCode == "T05");
    }

    [Fact]
    public void DraftProfile_DoesNotDriveEligibility()
    {
        var profile = ActiveProfile();
        profile.Status = FieldWorkProfileStatus.Draft;
        profile.Pruning = new PruningProfile
        {
            FrequencyType = FrequencyType.EveryNYears,
            FrequencyValue = 2,
            LastPerformedYear = 2025
        };

        var result = Eval(Pruning, profile, 2026, new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));
        Assert.Equal(TemplateEligibilityStatus.Enabled, result.Status);
        Assert.Equal(ReasonCodes.NoActiveProfile, result.ReasonCode);
    }

    private static FieldWorkProfile ActiveProfile() => new()
    {
        Id = "profile-1",
        FieldId = "field-1",
        Status = FieldWorkProfileStatus.Active,
        ResultYearCreated = 2026
    };

    private static TemplateEligibilityResult Eval(
        FieldWorkCatalogueEntry entry,
        FieldWorkProfile profile,
        int resultYear,
        DateTime utcNow,
        ProposalSourceType? source = null,
        IReadOnlyDictionary<string, int>? completed = null,
        bool analysisEvidence = false,
        bool observationEvidence = false,
        bool treatAsOfficial = false) =>
        FieldWorkProfileEligibility.EvaluateTemplateForField(new TemplateEligibilityContext
        {
            Entry = entry,
            FieldId = "field-1",
            Profile = profile,
            ResultYear = resultYear,
            UtcNow = utcNow,
            CandidateSourceType = source,
            CompletedCountsByTemplate = completed ?? new Dictionary<string, int>(),
            HasAnalysisEvidence = analysisEvidence,
            HasObservationEvidence = observationEvidence,
            TreatAsOfficialOrSafetyInformation = treatAsOfficial
        });
}
