using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Application.Services.Fields;
using OliveLifecycle.Application.Services.Geospatial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class FieldSpatialProfileServiceTests
{
    private static readonly DateTime Now = new(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IFieldSpatialProfileRepository> _profileRepository = new();
    private readonly Mock<IFieldRepository> _fieldRepository = new();
    private readonly Mock<IElevationProvider> _elevationProvider = new();
    private readonly Mock<ILandCoverProvider> _landCoverProvider = new();
    private readonly Mock<ISoilProvider> _soilProvider = new();
    private readonly Mock<IProtectedAreaProvider> _protectedAreaProvider = new();
    private readonly Mock<IFireDetectionRepository> _fireDetectionRepository = new();
    private readonly Mock<IWeatherIntelligenceService> _weatherService = new();
    private readonly Mock<IFieldSatelliteObservationRepository> _satelliteRepository = new();
    private readonly Mock<IFieldEnvironmentalAlertRepository> _alertRepository = new();
    private readonly Mock<IDateTimeProvider> _dateTimeProvider = new();
    private readonly GeospatialOptions _options = new();

    private FieldSpatialProfile? _saved;

    public FieldSpatialProfileServiceTests()
    {
        _dateTimeProvider.SetupGet(d => d.UtcNow).Returns(Now);

        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateField());
        _profileRepository.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => _saved);
        _profileRepository.Setup(r => r.UpsertAsync(It.IsAny<FieldSpatialProfile>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldSpatialProfile p, CancellationToken _) => p)
            .Callback((FieldSpatialProfile p, CancellationToken _) => _saved = p);

        _elevationProvider.SetupGet(p => p.ProviderName).Returns("Copernicus DEM GLO-30");
        _elevationProvider.Setup(p => p.AnalyzeTerrainAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TerrainAnalysisResult
            {
                Summary = new TerrainSummary { AverageElevationM = 240, AverageSlopePercent = 8, DominantAspect = "S" }
            });
        _landCoverProvider.Setup(p => p.AnalyzeLandCoverAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LandCoverSummary { DominantClass = "Cropland" });
        _soilProvider.Setup(p => p.AnalyzeSoilAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SoilSummary { Ph = 7.2, IsRegionalEstimate = true });
        _protectedAreaProvider.Setup(p => p.AnalyzeProtectedAreasAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EnvironmentalSummary { DistanceToNearestNaturaKm = 4.2, NearestNaturaSite = "Ymittos" });
        _fireDetectionRepository.Setup(r => r.GetRecentAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FireDetection>());
        _satelliteRepository.Setup(r => r.GetLatestUsableAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldSatelliteObservation?)null);
        _alertRepository.Setup(r => r.GetByDedupKeyAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldEnvironmentalAlert?)null);
        _alertRepository.Setup(r => r.UpsertAsync(It.IsAny<FieldEnvironmentalAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldEnvironmentalAlert a, CancellationToken _) => a);
        _alertRepository.Setup(r => r.GetActiveByFieldIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FieldEnvironmentalAlert>());

        SetWeather("None");
    }

    private void SetWeather(string frostLevel, double? minTempC = null)
    {
        _weatherService.Setup(s => s.GetFieldWeatherAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldWeatherDto
            {
                FieldId = "field-1",
                LastUpdatedAt = Now,
                Current = new CurrentWeatherDto { TemperatureC = 14, WindSpeedKmh = 9 },
                Rain = new RainIntelligenceDto { Forecast24hMm = 2 },
                Wind = new WindIntelligenceDto(),
                Frost = new FrostRiskDto { Level = frostLevel, ForecastMinTempC = minTempC, Window = "03:00–06:00" },
                Metadata = new DataSourceMetadataDto { Source = "Open-Meteo", SpatialResolution = "~1-11 km" }
            });
    }

    private static Field CreateField() => new()
    {
        Id = "field-1",
        OwnerId = "owner-1",
        Boundary = new GeoJsonPolygon
        {
            Coordinates =
            [
                [
                    [23.700, 37.900],
                    [23.710, 37.900],
                    [23.710, 37.910],
                    [23.700, 37.910],
                    [23.700, 37.900]
                ]
            ]
        }
    };

    private FieldSpatialProfileService CreateService() => new(
        _profileRepository.Object,
        _fieldRepository.Object,
        _elevationProvider.Object,
        _landCoverProvider.Object,
        _soilProvider.Object,
        _protectedAreaProvider.Object,
        _fireDetectionRepository.Object,
        _weatherService.Object,
        _satelliteRepository.Object,
        _alertRepository.Object,
        new FieldEnvironmentalAlertEvaluator(
            _alertRepository.Object,
            _dateTimeProvider.Object,
            Options.Create(_options),
            NullLogger<FieldEnvironmentalAlertEvaluator>.Instance),
        new FieldAreaCalculator(),
        _dateTimeProvider.Object,
        Options.Create(_options),
        NullLogger<FieldSpatialProfileService>.Instance);

    [Fact]
    public async Task ProcessFieldAsync_CompletesWhenEverySourceSucceeds()
    {
        await CreateService().ProcessFieldAsync("field-1");

        Assert.NotNull(_saved);
        Assert.Equal(GeospatialProcessingStatus.Completed, _saved!.ProcessingStatus);
        Assert.Null(_saved.ProcessingError);
        Assert.Equal(Now, _saved.CalculatedAt);
    }

    [Fact]
    public async Task ProcessFieldAsync_StoresGeometryDerivedFromTheBoundary()
    {
        await CreateService().ProcessFieldAsync("field-1");

        var geometry = _saved!.GeometrySummary;
        Assert.NotNull(geometry);
        Assert.InRange(geometry!.AreaSqm, 900_000, 1_300_000);
        Assert.InRange(geometry.CentroidLat, 37.90, 37.91);
        Assert.InRange(geometry.CentroidLng, 23.70, 23.71);
        Assert.Equal(23.700, geometry.BboxMinLng, 5);
        Assert.Equal(37.910, geometry.BboxMaxLat, 5);
    }

    [Fact]
    public async Task ProcessFieldAsync_CollectsEverySource()
    {
        await CreateService().ProcessFieldAsync("field-1");

        Assert.Equal(240, _saved!.TerrainSummary!.AverageElevationM);
        Assert.Equal("Cropland", _saved.LandCoverSummary!.DominantClass);
        Assert.Equal(7.2, _saved.SoilSummary!.Ph);
        Assert.Equal("Ymittos", _saved.EnvironmentalSummary!.NearestNaturaSite);
        Assert.Equal(14, _saved.LatestWeatherSummary!.CurrentTemperatureC);
    }

    [Fact]
    public async Task ProcessFieldAsync_MarksProfilePartialWhenOneProviderFails()
    {
        _soilProvider.Setup(p => p.AnalyzeSoilAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("SoilGrids down"));

        await CreateService().ProcessFieldAsync("field-1");

        Assert.Equal(GeospatialProcessingStatus.Partial, _saved!.ProcessingStatus);
        Assert.Contains("soil", _saved.ProcessingError);
        // Sources that did respond are still stored.
        Assert.Equal(240, _saved.TerrainSummary!.AverageElevationM);
        Assert.Equal("Cropland", _saved.LandCoverSummary!.DominantClass);
    }

    [Fact]
    public async Task ProcessFieldAsync_KeepsPreviousValueWhenAProviderFails()
    {
        _saved = new FieldSpatialProfile
        {
            Id = "field-1",
            FieldId = "field-1",
            SoilSummary = new SoilSummary { Ph = 6.5, IsRegionalEstimate = true }
        };
        _soilProvider.Setup(p => p.AnalyzeSoilAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("SoilGrids down"));

        await CreateService().ProcessFieldAsync("field-1");

        Assert.Equal(6.5, _saved!.SoilSummary!.Ph);
    }

    [Fact]
    public async Task ProcessFieldAsync_ListsEveryFailedSource()
    {
        _soilProvider.Setup(p => p.AnalyzeSoilAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("down"));
        _landCoverProvider.Setup(p => p.AnalyzeLandCoverAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("down"));

        await CreateService().ProcessFieldAsync("field-1");

        Assert.Contains("soil", _saved!.ProcessingError);
        Assert.Contains("land cover", _saved.ProcessingError);
    }

    [Fact]
    public async Task ProcessFieldAsync_FlagsSourcesTooCoarseForTheFieldAsRegionalEstimates()
    {
        // ~97 ha: the weather model cell dwarfs it, while the 250 m soil grid does not.
        await CreateService().ProcessFieldAsync("field-1");

        Assert.True(_saved!.LatestWeatherSummary!.Metadata.IsRegionalEstimate);
        Assert.Contains("weather model", _saved.LatestWeatherSummary.Metadata.ConfidenceNote);
        Assert.False(_saved.SoilSummary!.Metadata.IsRegionalEstimate);
    }

    [Fact]
    public async Task ProcessFieldAsync_FlagsTheSoilGridAsRegionalForASmallPlot()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateSmallField());

        await CreateService().ProcessFieldAsync("field-1");

        Assert.True(_saved!.SoilSummary!.Metadata.IsRegionalEstimate);
        Assert.Contains("SoilGrids", _saved.SoilSummary.Metadata.ConfidenceNote);
        // A 10 m land cover grid still resolves a plot this size.
        Assert.False(_saved.LandCoverSummary!.Metadata.IsRegionalEstimate);
    }

    [Fact]
    public async Task ProcessFieldAsync_KeepsAProviderCaveatRatherThanReplacingItWithTheResolutionNote()
    {
        _soilProvider.Setup(p => p.AnalyzeSoilAsync(It.IsAny<GeoJsonPolygon>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SoilSummary
            {
                Ph = 7.2,
                Metadata = new DataSourceMetadata { ConfidenceNote = "Only 3 of 9 sample points resolved." }
            });
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateSmallField());

        await CreateService().ProcessFieldAsync("field-1");

        Assert.Equal("Only 3 of 9 sample points resolved.", _saved!.SoilSummary!.Metadata.ConfidenceNote);
        Assert.True(_saved.SoilSummary.Metadata.IsRegionalEstimate);
    }

    /// <summary>A roughly 0.5 ha plot, typical of a smallholder olive parcel.</summary>
    private static Field CreateSmallField() => new()
    {
        Id = "field-1",
        OwnerId = "owner-1",
        Boundary = new GeoJsonPolygon
        {
            Coordinates =
            [
                [
                    [23.7000, 37.9000],
                    [23.7008, 37.9000],
                    [23.7008, 37.9006],
                    [23.7000, 37.9006],
                    [23.7000, 37.9000]
                ]
            ]
        }
    };

    [Fact]
    public async Task ProcessFieldAsync_IncrementsVersionOnEachRun()
    {
        var service = CreateService();

        await service.ProcessFieldAsync("field-1");
        var firstVersion = _saved!.Version;
        await service.ProcessFieldAsync("field-1");

        Assert.Equal(firstVersion + 1, _saved.Version);
    }

    [Fact]
    public async Task ProcessFieldAsync_DoesNothingWithoutABoundary()
    {
        _fieldRepository.Setup(r => r.GetByIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Field { Id = "field-1", OwnerId = "owner-1" });

        await CreateService().ProcessFieldAsync("field-1");

        _profileRepository.Verify(r => r.UpsertAsync(It.IsAny<FieldSpatialProfile>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ProcessFieldAsync_ReportsClosestFireWithinTheSearchRadius()
    {
        _fireDetectionRepository.Setup(r => r.GetRecentAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FireDetection>
            {
                // ~11 km north of the field centroid.
                new() { Id = "f1", Latitude = 38.005, Longitude = 23.705, DetectedAt = Now.AddHours(-2), Confidence = "High" },
                new() { Id = "f2", Latitude = 40.000, Longitude = 23.705, DetectedAt = Now.AddHours(-1) }
            });

        await CreateService().ProcessFieldAsync("field-1");

        var fire = _saved!.EnvironmentalSummary!.ClosestFire;
        Assert.NotNull(fire);
        Assert.InRange(fire!.DistanceKm, 8, 15);
        Assert.Equal("N", fire.Direction);
        Assert.Equal("High", fire.Confidence);
    }

    [Fact]
    public async Task ProcessFieldAsync_IgnoresFiresBeyondTheSearchRadius()
    {
        _options.Fires.SearchRadiusKm = 5;
        _fireDetectionRepository.Setup(r => r.GetRecentAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<FireDetection>
            {
                new() { Id = "f1", Latitude = 38.500, Longitude = 23.705, DetectedAt = Now.AddHours(-2) }
            });

        await CreateService().ProcessFieldAsync("field-1");

        Assert.Null(_saved!.EnvironmentalSummary!.ClosestFire);
    }

    [Fact]
    public async Task ProcessFieldAsync_RaisesAFrostAlertForHighRisk()
    {
        SetWeather("High", -0.5);

        await CreateService().ProcessFieldAsync("field-1");

        _alertRepository.Verify(r => r.UpsertAsync(
            It.Is<FieldEnvironmentalAlert>(a =>
                a.AlertType == EnvironmentalAlertType.Frost &&
                a.FieldId == "field-1" &&
                a.IsActive &&
                a.DedupKey == "frost_field-1_20260315"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ProcessFieldAsync_FrostAlertExplainsTheSourceResolution()
    {
        SetWeather("Critical", -2);
        FieldEnvironmentalAlert? captured = null;
        _alertRepository.Setup(r => r.UpsertAsync(It.IsAny<FieldEnvironmentalAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldEnvironmentalAlert a, CancellationToken _) => a)
            .Callback((FieldEnvironmentalAlert a, CancellationToken _) => captured = a);

        await CreateService().ProcessFieldAsync("field-1");

        Assert.NotNull(captured);
        Assert.Contains("-2.0°C", captured!.Message);
        Assert.Contains("~1-11 km", captured.Message);
    }

    [Fact]
    public async Task ProcessFieldAsync_DoesNotRaiseAFrostAlertForLowRisk()
    {
        SetWeather("Low", 3.5);

        await CreateService().ProcessFieldAsync("field-1");

        _alertRepository.Verify(r => r.UpsertAsync(It.IsAny<FieldEnvironmentalAlert>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ProcessFieldAsync_RaisesOneFrostAlertPerDay()
    {
        SetWeather("High", -0.5);
        _alertRepository.Setup(r => r.GetByDedupKeyAsync("frost_field-1_20260315", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FieldEnvironmentalAlert { Id = "existing" });

        await CreateService().ProcessFieldAsync("field-1");

        _alertRepository.Verify(r => r.UpsertAsync(It.IsAny<FieldEnvironmentalAlert>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetIntelligenceSummaryAsync_ReportsPendingBeforeAnyProcessing()
    {
        _profileRepository.Setup(r => r.GetByFieldIdAsync("field-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync((FieldSpatialProfile?)null);

        var summary = await CreateService().GetIntelligenceSummaryAsync(CreateField());

        Assert.Equal("pending", summary.ProcessingStatus);
        Assert.Null(summary.Terrain);
        Assert.Empty(summary.Alerts);
    }

    [Fact]
    public async Task GetIntelligenceSummaryAsync_StillReturnsProfileWhenWeatherIsUnavailable()
    {
        _saved = new FieldSpatialProfile
        {
            Id = "field-1",
            FieldId = "field-1",
            ProcessingStatus = GeospatialProcessingStatus.Completed,
            TerrainSummary = new TerrainSummary { AverageElevationM = 240 }
        };
        _weatherService.Setup(s => s.GetFieldWeatherAsync(It.IsAny<Field>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("weather down"));

        var summary = await CreateService().GetIntelligenceSummaryAsync(CreateField());

        Assert.Null(summary.Weather);
        Assert.Equal(240, summary.Terrain!.AverageElevationM);
        Assert.Equal("completed", summary.ProcessingStatus);
    }
}
