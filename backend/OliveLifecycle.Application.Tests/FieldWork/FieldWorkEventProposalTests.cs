using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkEventCatalogueTests
{
    [Fact]
    public void EventCatalogue_ContainsE01ThroughE08()
    {
        Assert.Equal(8, FieldWorkEventCatalogue.All.Count);
        for (var i = 1; i <= 8; i++)
        {
            Assert.NotNull(FieldWorkEventCatalogue.GetByCode($"E{i:D2}"));
        }
    }

    [Fact]
    public void EventCatalogue_NeverAutoInstructsSprayOrDose()
    {
        foreach (var entry in FieldWorkEventCatalogue.All)
        {
            var blob = string.Join(' ',
                entry.Description,
                entry.GreekName,
                string.Join(' ', entry.Rules.Select(r => r.GreekExplanation + " " + r.EnglishExplanation)));
            Assert.DoesNotContain("Ψέκασε τώρα", blob, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("spray now", blob, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("dose", blob, StringComparison.OrdinalIgnoreCase);
            Assert.All(entry.Rules, r => Assert.Equal(ProposalSourceType.WeatherRule, r.SourceType));
            Assert.All(entry.Rules, r => Assert.NotNull(r.RequiredEventKind));
        }
    }
}

public class FieldWorkEventSignalDetectorTests
{
    [Fact]
    public void FrostUrgent_AtOrBelowZero_CreatesStrongFrostSignal()
    {
        var signals = FieldWorkEventSignalDetector.Detect(BaseInput() with
        {
            ForecastMinTempC = -1,
            FrostRiskLevel = "Critical"
        });

        Assert.True(signals.FrostInspectionDue);
        Assert.True(signals.FrostUrgent);
    }

    [Fact]
    public void StormGust_AtConfiguredThreshold_TriggersInspection()
    {
        var signals = FieldWorkEventSignalDetector.Detect(BaseInput() with
        {
            MaxGustKmh = 70
        });

        Assert.True(signals.StormInspectionDue);
    }

    [Fact]
    public void Heat_At38_IsUrgentInspection()
    {
        var signals = FieldWorkEventSignalDetector.Detect(BaseInput() with
        {
            ForecastMaxTempC = 38
        });

        Assert.True(signals.HeatInspectionDue);
        Assert.True(signals.HeatUrgent);
    }

    [Fact]
    public void PostTreatmentRain_WithinRainfast_TriggersReview_NotRepeat()
    {
        var now = new DateTime(2026, 4, 10, 12, 0, 0, DateTimeKind.Utc);
        var signals = FieldWorkEventSignalDetector.Detect(BaseInput(now) with
        {
            RecentRainMm = 3,
            RecentExecutions =
            [
                new FieldWorkRecentExecutionSignal
                {
                    TaskId = "task-pp",
                    TemplateCode = "T_SPRAY",
                    CompletedAt = now.AddHours(-2),
                    IsPlantProtectionTreatment = true,
                    RainfastHours = 6
                }
            ]
        });

        Assert.True(signals.PostTreatmentRainReviewDue);
        Assert.Equal(3, signals.PostTreatmentRainMm);
        Assert.Equal("task-pp", signals.PostTreatmentTaskId);
    }

    [Fact]
    public void FertiliserThenHeavyRain_TriggersReview()
    {
        var now = new DateTime(2026, 3, 20, 12, 0, 0, DateTimeKind.Utc);
        var signals = FieldWorkEventSignalDetector.Detect(BaseInput(now) with
        {
            RecentRainMm = 15,
            RecentExecutions =
            [
                new FieldWorkRecentExecutionSignal
                {
                    TaskId = "task-fert",
                    TemplateCode = "T05",
                    CompletedAt = now.AddHours(-6),
                    IsSurfaceFertilisation = true
                }
            ]
        });

        Assert.True(signals.FertiliserHeavyRainReviewDue);
    }

    [Fact]
    public void SatelliteAnomalyAlert_TriggersFieldCheck()
    {
        var signals = FieldWorkEventSignalDetector.Detect(BaseInput() with
        {
            HasActiveVegetationAlert = true
        });

        Assert.True(signals.SatelliteAnomalyReviewDue);
    }

    private static FieldWorkEventSignalInput BaseInput(DateTime? now = null) => new()
    {
        UtcNow = now ?? new DateTime(2026, 4, 1, 12, 0, 0, DateTimeKind.Utc),
        Phenology = new FieldPhenologySnapshot { IsKnown = false, StageCode = OliveBbchStage.Unknown }
    };
}

public class EventProposalRuleEvaluatorTests
{
    [Fact]
    public void WithoutSignals_EventTemplates_AreNotProposed()
    {
        var context = ActiveContext();
        var candidates = ProposalRuleEvaluator.Evaluate(context);
        Assert.DoesNotContain(candidates, c => c.TemplateCode.StartsWith('E'));
    }

    [Fact]
    public void FrostSignal_ProposesE01_WithMeasuredTemp()
    {
        var context = ActiveContext() with
        {
            EventSignals = new FieldWorkEventSignals
            {
                FrostInspectionDue = true,
                FrostUrgent = true,
                ForecastMinTempC = -2
            }
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        var frost = Assert.Single(candidates, c => c.TemplateCode == "E01");
        Assert.Equal(ProposalSourceType.WeatherRule, frost.SourceType);
        Assert.Equal(ProposalConfidence.StrongEvidence, frost.Confidence);
        Assert.Contains("-2", frost.GreekExplanation);
        Assert.DoesNotContain("Ψέκασε", frost.GreekExplanation);
    }

    [Fact]
    public void OfficialWarningForE04_OutranksSeasonalAndCreatesReview()
    {
        var context = ActiveContext() with
        {
            ActiveWarnings =
            [
                new Core.Entities.FieldWork.OfficialAgriculturalWarning
                {
                    Id = "w1",
                    Title = "Κυκλοκόνιο Δυτικής Ελλάδας",
                    IsActive = true,
                    TemplateCodes = ["E04"],
                    FieldIds = ["field-1"]
                }
            ]
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        var peacock = Assert.Single(candidates, c => c.TemplateCode == "E04");
        Assert.Equal(ProposalSourceType.OfficialWarning, peacock.SourceType);
        Assert.Equal(ProposalConfidence.StrongEvidence, peacock.Confidence);
    }

    private static ProposalEvaluationContext ActiveContext() => new()
    {
        FieldId = "field-1",
        FieldStatus = FieldStatus.Active,
        IsIrrigated = true,
        ResultYear = 2026,
        UtcNow = new DateTime(2026, 4, 1, 12, 0, 0, DateTimeKind.Utc),
        Phenology = new FieldPhenologySnapshot { IsKnown = false, StageCode = OliveBbchStage.Unknown }
    };
}
