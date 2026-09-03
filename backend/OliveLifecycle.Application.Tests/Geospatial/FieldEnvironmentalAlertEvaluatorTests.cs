using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class FieldEnvironmentalAlertEvaluatorTests
{
    private static readonly DateTime Now = new(2026, 5, 10, 8, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IFieldEnvironmentalAlertRepository> _alertRepository = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();
    private readonly GeospatialOptions _options = new();
    private readonly List<FieldEnvironmentalAlert> _raised = [];
    private readonly List<string> _withdrawn = [];
    private readonly Dictionary<string, FieldEnvironmentalAlert> _existing = [];

    public FieldEnvironmentalAlertEvaluatorTests()
    {
        _dateTimeProvider.SetupGet(d => d.UtcNow).Returns(Now);

        _alertRepository.Setup(r => r.GetByDedupKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string key, CancellationToken _) => _existing.GetValueOrDefault(key));
        _alertRepository.Setup(r => r.UpsertAsync(It.IsAny<FieldEnvironmentalAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldEnvironmentalAlert a, CancellationToken _) => a)
            .Callback((FieldEnvironmentalAlert a, CancellationToken _) => _raised.Add(a));
        _alertRepository.Setup(r => r.DeactivateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Callback((string id, CancellationToken _) => _withdrawn.Add(id));
    }

    private FieldEnvironmentalAlertEvaluator CreateEvaluator() => new(
        _alertRepository.Object,
        _dateTimeProvider.Object,
        Options.Create(_options),
        NullLogger<FieldEnvironmentalAlertEvaluator>.Instance);

    private static Field Field() => new() { Id = "field-1", OwnerId = "owner-1" };

    private static FieldSpatialProfile Profile(
        WeatherSummary? weather = null,
        ClosestFireSummary? fire = null,
        SatelliteSummary? satellite = null) => new()
    {
        Id = "field-1",
        FieldId = "field-1",
        LatestWeatherSummary = weather,
        EnvironmentalSummary = fire == null ? null : new EnvironmentalSummary { ClosestFire = fire },
        LatestSatelliteSummary = satellite
    };

    private void GivenActive(string dedupKey, EnvironmentalAlertType type) =>
        _existing[dedupKey] = new FieldEnvironmentalAlert
        {
            Id = $"existing-{dedupKey}",
            FieldId = "field-1",
            DedupKey = dedupKey,
            AlertType = type,
            IsActive = true
        };

    private FieldEnvironmentalAlert Raised(EnvironmentalAlertType type) =>
        Assert.Single(_raised, a => a.AlertType == type);

    [Fact]
    public async Task EvaluateAsync_RaisesFrostForHighRiskAndExplainsTheSource()
    {
        var profile = Profile(new WeatherSummary
        {
            FrostRiskLevel = "High",
            ForecastMinTempC = -0.5,
            FrostWindow = "03:00–06:00"
        });

        await CreateEvaluator().EvaluateAsync(Field(), profile);

        var alert = Raised(EnvironmentalAlertType.Frost);
        Assert.Equal("frost_field-1_20260510", alert.DedupKey);
        Assert.Equal("high", alert.Severity);
        Assert.Contains("-0.5°C", alert.Message);
        Assert.Contains("03:00–06:00", alert.Message);
        Assert.Contains("modelled forecast", alert.Message);
    }

    [Fact]
    public async Task EvaluateAsync_DoesNotRepeatTheSameDaysFrostAlert()
    {
        GivenActive("frost_field-1_20260510", EnvironmentalAlertType.Frost);

        await CreateEvaluator().EvaluateAsync(Field(), Profile(new WeatherSummary { FrostRiskLevel = "Critical" }));

        Assert.DoesNotContain(_raised, a => a.AlertType == EnvironmentalAlertType.Frost);
    }

    [Fact]
    public async Task EvaluateAsync_RaisesHeatOnlyOnceTheThresholdIsReached()
    {
        await CreateEvaluator().EvaluateAsync(Field(), Profile(new WeatherSummary { ForecastMaxTempC = 37 }));

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateAsync_EscalatesHeatWellAboveTheThreshold()
    {
        await CreateEvaluator().EvaluateAsync(Field(), Profile(new WeatherSummary { ForecastMaxTempC = 43 }));

        var alert = Raised(EnvironmentalAlertType.Heat);
        Assert.Equal("high", alert.Severity);
        Assert.Contains("43°C", alert.Message);
    }

    [Fact]
    public async Task EvaluateAsync_WithdrawsHeatWhenTheForecastCoolsDown()
    {
        GivenActive("heat_field-1_20260510", EnvironmentalAlertType.Heat);

        await CreateEvaluator().EvaluateAsync(Field(), Profile(new WeatherSummary { ForecastMaxTempC = 24 }));

        Assert.Equal(["existing-heat_field-1_20260510"], _withdrawn);
    }

    [Fact]
    public async Task EvaluateAsync_RaisesFireProximityWithTheDetectionDetails()
    {
        var fire = new ClosestFireSummary
        {
            DistanceKm = 3.2,
            Direction = "NW",
            DetectedAt = Now.AddHours(-1),
            Confidence = "High"
        };

        await CreateEvaluator().EvaluateAsync(Field(), Profile(fire: fire));

        var alert = Raised(EnvironmentalAlertType.FireProximity);
        Assert.Equal("critical", alert.Severity);
        Assert.Equal(DataConfidenceLevel.High, alert.Confidence);
        Assert.Contains("3.2 km to the NW", alert.Message);
        Assert.Contains("civil protection", alert.Message);
    }

    [Fact]
    public async Task EvaluateAsync_IgnoresFiresOutsideTheAlertRadius()
    {
        var fire = new ClosestFireSummary { DistanceKm = 30, DetectedAt = Now.AddHours(-1) };

        await CreateEvaluator().EvaluateAsync(Field(), Profile(fire: fire));

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateAsync_RaisesVegetationChangeForASustainedFieldWideDrop()
    {
        var satellite = new SatelliteSummary
        {
            ObservationDate = Now.AddDays(-2),
            ComparedToObservationDate = Now.AddDays(-14),
            NdviChangePercent = -22,
            AreaBelowBaselinePercent = 55,
            UsablePixelPercent = 92
        };

        await CreateEvaluator().EvaluateAsync(Field(), Profile(satellite: satellite));

        var alert = Raised(EnvironmentalAlertType.VegetationChange);
        Assert.Equal("medium", alert.Severity);
        Assert.Equal(DataConfidenceLevel.High, alert.Confidence);
        Assert.Contains("22% lower", alert.Message);
        Assert.Contains("55% of the field", alert.Message);
        Assert.Contains("not its cause", alert.Message);
    }

    [Fact]
    public async Task EvaluateAsync_IgnoresVegetationDropsAffectingOnlyAFewPixels()
    {
        var satellite = new SatelliteSummary
        {
            ObservationDate = Now.AddDays(-2),
            NdviChangePercent = -30,
            AreaBelowBaselinePercent = 4
        };

        await CreateEvaluator().EvaluateAsync(Field(), Profile(satellite: satellite));

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateAsync_IgnoresVegetationDropsFromStaleObservations()
    {
        var satellite = new SatelliteSummary
        {
            ObservationDate = Now.AddDays(-60),
            NdviChangePercent = -30,
            AreaBelowBaselinePercent = 70
        };

        await CreateEvaluator().EvaluateAsync(Field(), Profile(satellite: satellite));

        Assert.Empty(_raised);
    }

    [Fact]
    public async Task EvaluateAsync_WithdrawsVegetationChangeOnceTheFieldRecovers()
    {
        GivenActive("vegetation_field-1", EnvironmentalAlertType.VegetationChange);
        var satellite = new SatelliteSummary
        {
            ObservationDate = Now.AddDays(-1),
            NdviChangePercent = 3,
            AreaBelowBaselinePercent = 2
        };

        await CreateEvaluator().EvaluateAsync(Field(), Profile(satellite: satellite));

        Assert.Equal(["existing-vegetation_field-1"], _withdrawn);
    }

    [Fact]
    public async Task EvaluateAsync_KeepsTheOriginalIdAndStartTimeWhenUpdatingAnAlert()
    {
        GivenActive("heat_field-1_20260510", EnvironmentalAlertType.Heat);
        _existing["heat_field-1_20260510"].ValidFrom = Now.AddHours(-5);
        _existing["heat_field-1_20260510"].CreatedAt = Now.AddHours(-5);

        await CreateEvaluator().EvaluateAsync(Field(), Profile(new WeatherSummary { ForecastMaxTempC = 40 }));

        var alert = Raised(EnvironmentalAlertType.Heat);
        Assert.Equal("existing-heat_field-1_20260510", alert.Id);
        Assert.Equal(Now.AddHours(-5), alert.ValidFrom);
    }

    [Fact]
    public async Task EvaluateAsync_RaisesNothingForAQuietProfile()
    {
        await CreateEvaluator().EvaluateAsync(Field(), Profile(new WeatherSummary { FrostRiskLevel = "None", ForecastMaxTempC = 21 }));

        Assert.Empty(_raised);
        Assert.Empty(_withdrawn);
    }
}
