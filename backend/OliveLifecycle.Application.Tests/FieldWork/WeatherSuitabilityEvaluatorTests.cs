using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class WeatherSuitabilityEvaluatorTests
{
    private static WeatherSuitabilityEvaluationInput Base(DateTime now, DateTime? candidateStart = null) => new()
    {
        UtcNow = now,
        CandidateStart = candidateStart ?? now.AddHours(12),
        HasWeatherData = true,
        ForecastFetchedAt = now.AddHours(-1),
        WeatherRuleProfile = "default",
        RainMmInWindow = 0,
        MaxWindKmhInWindow = 10,
        MaxGustKmhInWindow = 12,
        HumidityPercent = 55,
        MaxTempC = 28
    };

    [Fact]
    public void MissingWeather_IsUnknown_NotGood()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now) with { HasWeatherData = false };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Unknown, result.Suitability);
        Assert.NotEqual(WeatherSuitability.Good, result.Suitability);
    }

    [Fact]
    public void StaleForecast_Over6Hours_IsUnknown()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now) with { ForecastFetchedAt = now.AddHours(-6.1) };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Unknown, result.Suitability);
        Assert.Contains(result.Reasons, r => r.Contains("6", StringComparison.Ordinal));
    }

    [Fact]
    public void Within72Hours_ClearConditions_CanBeGood()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now, now.AddHours(48));

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Good, result.Suitability);
        Assert.True(result.ForecastHorizonHours <= WeatherSuitabilityHorizon.GoodEligibleMaxHours);
    }

    [Fact]
    public void FourToSevenDays_NeverGood_TentativeCautionAtBest()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now, now.AddHours(100));

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.NotEqual(WeatherSuitability.Good, result.Suitability);
        Assert.Equal(WeatherSuitability.Caution, result.Suitability);
    }

    [Fact]
    public void BeyondSevenDays_NeverGood_IsUnknown()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now, now.AddDays(8));

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Unknown, result.Suitability);
        Assert.NotEqual(WeatherSuitability.Good, result.Suitability);
    }

    [Fact]
    public void PlantProtection_MissingLabel_IsUnknown_WithGreekMessage()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now) with
        {
            WeatherRuleProfile = "spraying",
            RequiresProductLabel = true,
            ProductLabel = null,
            Language = "el"
        };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Unknown, result.Suitability);
        Assert.Contains("missing_product_label", result.HardBlockers);
        Assert.Contains(
            FieldWorkDisplayLabels.MissingProductLabel("el"),
            result.Reasons);
        Assert.StartsWith("Χρειάζονται τα στοιχεία της ετικέτας", result.Reasons[0]);
    }

    [Fact]
    public void PlantProtection_WithLabel_ClearConditions_CanBeGood()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now) with
        {
            WeatherRuleProfile = "spraying",
            RequiresProductLabel = true,
            ProductLabel = new PlantProtectionProductLabel
            {
                ProductName = "Demo",
                RainfastHours = 4,
                MaxWindKmh = 20,
                MaxGustKmh = 30,
                IsApprovedForCropAndTarget = true
            },
            RainMmInWindow = 0,
            MaxWindKmhInWindow = 8,
            MaxGustKmhInWindow = 10
        };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Good, result.Suitability);
    }

    [Fact]
    public void Harvest_HeavyRain_IsUnsuitable()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var input = Base(now) with
        {
            WeatherRuleProfile = "harvest",
            RainMmInWindow = 8
        };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Unsuitable, result.Suitability);
    }

    [Fact]
    public void DoesNotSuggestChangingUserDate_OnlyRanksSuitability()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        var candidate = now.AddHours(20);
        var input = Base(now, candidate) with { RainMmInWindow = 12, WeatherRuleProfile = "harvest" };

        var result = WeatherSuitabilityEvaluator.Evaluate(input);

        Assert.Equal(WeatherSuitability.Unsuitable, result.Suitability);
        Assert.DoesNotContain(result.HardBlockers, b => b.Contains("reschedule", StringComparison.OrdinalIgnoreCase));
        // Evaluator has no API to mutate CandidateStart — callers must keep PlannedStart unchanged.
        Assert.Equal(candidate, input.CandidateStart);
    }
}
