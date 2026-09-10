using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class FieldWorkCatalogueTests
{
    [Fact]
    public void Catalogue_ContainsT01ThroughT24()
    {
        Assert.Equal(24, FieldWorkCatalogue.All.Count);
        for (var i = 1; i <= 24; i++)
        {
            var code = $"T{i:D2}";
            Assert.NotNull(FieldWorkCatalogue.GetByCode(code));
        }
    }

    [Fact]
    public void Catalogue_EveryTemplate_HasChecklistAndAtLeastOneRule()
    {
        foreach (var entry in FieldWorkCatalogue.All)
        {
            Assert.NotEmpty(entry.DefaultChecklist);
            Assert.NotEmpty(entry.Rules);
            Assert.False(string.IsNullOrWhiteSpace(entry.GreekName));
            Assert.False(string.IsNullOrWhiteSpace(entry.EnglishName));
        }
    }

    [Fact]
    public void Catalogue_DoesNotIncludePesticideDoseRecommendations()
    {
        foreach (var entry in FieldWorkCatalogue.All)
        {
            var blob = string.Join(' ',
                entry.Description,
                entry.GreekName,
                string.Join(' ', entry.Rules.Select(r => r.GreekExplanation)));
            Assert.DoesNotContain("δοσολογ", blob, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("dose", blob, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Ψέκασε τώρα", blob, StringComparison.OrdinalIgnoreCase);
        }
    }
}

public class ProposalRuleEvaluatorTests
{
    [Fact]
    public void SameEvaluation_DoesNotCreateDuplicateCandidates()
    {
        var context = ActiveContext(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));
        var first = ProposalRuleEvaluator.Evaluate(context);
        var second = ProposalRuleEvaluator.Evaluate(context);
        Assert.Equal(first.Count, second.Count);
        Assert.Equal(
            first.Select(c => c.TemplateCode).OrderBy(x => x),
            second.Select(c => c.TemplateCode).OrderBy(x => x));
        Assert.Equal(first.Count, first.Select(c => c.TemplateCode).Distinct().Count());
    }

    [Fact]
    public void WrongPhenologicalStage_SuppressesPruningProposal()
    {
        var context = ActiveContext(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));
        context = context with
        {
            Phenology = new FieldPhenologySnapshot
            {
                IsKnown = true,
                StageCode = OliveBbchStage.Flowering, // BBCH 60-69; pruning prefers before 55
                Source = PhenologySource.User,
                ObservedOn = context.UtcNow
            }
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        Assert.DoesNotContain(candidates, c => c.TemplateCode == "T06");
    }

    [Fact]
    public void DismissedForYear_SuppressesTemplate()
    {
        var context = ActiveContext(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc)) with
        {
            DismissedTemplateCodesForYear = ["T02"]
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        Assert.DoesNotContain(candidates, c => c.TemplateCode == "T02");
    }

    [Fact]
    public void OfficialWarning_CreatesFieldScopedStrongProposal()
    {
        var context = ActiveContext(new DateTime(2026, 5, 10, 12, 0, 0, DateTimeKind.Utc)) with
        {
            ActiveWarnings =
            [
                new OfficialAgriculturalWarning
                {
                    Id = "warn-1",
                    Title = "Δάκος — Δυτική Ελλάδα",
                    Message = "Συνθήκες ευνοϊκές. Αξιολογήστε με γεωπόνο.",
                    FieldIds = ["field-1"],
                    TemplateCodes = ["T14"],
                    SourceReference = "minagric-2025-10",
                    IsActive = true,
                    Confidence = ProposalConfidence.StrongEvidence
                }
            ]
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        var fly = Assert.Single(candidates, c => c.TemplateCode == "T14");
        Assert.Equal(ProposalSourceType.OfficialWarning, fly.SourceType);
        Assert.Equal(ProposalConfidence.StrongEvidence, fly.Confidence);
        Assert.Contains("επίσημη προειδοποίηση", fly.GreekExplanation, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Ψέκασε τώρα", fly.GreekExplanation);
    }

    [Fact]
    public void DraftField_ReceivesNoProposals()
    {
        var context = ActiveContext(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc)) with
        {
            FieldStatus = FieldStatus.Draft
        };

        Assert.Empty(ProposalRuleEvaluator.Evaluate(context));
    }

    [Fact]
    public void MissingWeather_ProducesUnknownNotGood()
    {
        var context = ActiveContext(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc)) with
        {
            HasWeatherData = false,
            ObservedWeatherSuitability = WeatherSuitability.Good // must be ignored
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        Assert.NotEmpty(candidates);
        Assert.All(candidates, c => Assert.Equal(WeatherSuitability.Unknown, c.WeatherSuitability));
    }

    [Fact]
    public void OfficialWarning_OutranksSeasonalBaseline()
    {
        var context = ActiveContext(new DateTime(2026, 7, 10, 12, 0, 0, DateTimeKind.Utc)) with
        {
            ActiveWarnings =
            [
                new OfficialAgriculturalWarning
                {
                    Id = "warn-leaf",
                    Title = "Έλεγχος θρέψης",
                    FieldIds = ["field-1"],
                    TemplateCodes = ["T16"],
                    IsActive = true
                }
            ]
        };

        var leaf = Assert.Single(ProposalRuleEvaluator.Evaluate(context), c => c.TemplateCode == "T16");
        Assert.Equal(ProposalSourceType.OfficialWarning, leaf.SourceType);
        Assert.True(leaf.SourceType.Precedence() > ProposalSourceType.SeasonalBaseline.Precedence());
    }

    [Fact]
    public void IrrigatedOnlyTemplates_SkipRainfedFields()
    {
        var context = ActiveContext(new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc)) with
        {
            IsIrrigated = false
        };

        var candidates = ProposalRuleEvaluator.Evaluate(context);
        Assert.DoesNotContain(candidates, c => c.TemplateCode is "T08" or "T15");
    }

    private static ProposalEvaluationContext ActiveContext(DateTime utcNow) => new()
    {
        FieldId = "field-1",
        FieldStatus = FieldStatus.Active,
        IsIrrigated = true,
        ResultYear = 2026,
        UtcNow = utcNow,
        Phenology = FieldPhenologySnapshot.Unknown(),
        HasWeatherData = false
    };
}
