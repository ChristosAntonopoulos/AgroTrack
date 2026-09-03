using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Application.Services.Fields;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Geospatial;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface IFieldSpatialProfileService
{
    Task<FieldSpatialProfileDto?> GetProfileAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<FieldIntelligenceSummaryDto> GetIntelligenceSummaryAsync(Field field, CancellationToken cancellationToken = default);
    Task ProcessFieldAsync(string fieldId, CancellationToken cancellationToken = default);
}

/// <summary>
/// Builds a field's spatial profile by combining the free geospatial providers.
///
/// Each source is collected independently: a provider outage degrades that one
/// section and marks the profile <see cref="GeospatialProcessingStatus.Partial"/>,
/// rather than discarding everything that did succeed.
/// </summary>
public class FieldSpatialProfileService : IFieldSpatialProfileService
{
    private readonly IFieldSpatialProfileRepository _profileRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly IElevationProvider _elevationProvider;
    private readonly ILandCoverProvider _landCoverProvider;
    private readonly ISoilProvider _soilProvider;
    private readonly IProtectedAreaProvider _protectedAreaProvider;
    private readonly IFireDetectionRepository _fireDetectionRepository;
    private readonly IWeatherIntelligenceService _weatherIntelligenceService;
    private readonly IFieldSatelliteObservationRepository _satelliteRepository;
    private readonly IFieldEnvironmentalAlertRepository _alertRepository;
    private readonly IFieldEnvironmentalAlertEvaluator _alertEvaluator;
    private readonly IFieldAreaCalculator _fieldAreaCalculator;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly GeospatialOptions _options;
    private readonly ILogger<FieldSpatialProfileService> _logger;

    public FieldSpatialProfileService(
        IFieldSpatialProfileRepository profileRepository,
        IFieldRepository fieldRepository,
        IElevationProvider elevationProvider,
        ILandCoverProvider landCoverProvider,
        ISoilProvider soilProvider,
        IProtectedAreaProvider protectedAreaProvider,
        IFireDetectionRepository fireDetectionRepository,
        IWeatherIntelligenceService weatherIntelligenceService,
        IFieldSatelliteObservationRepository satelliteRepository,
        IFieldEnvironmentalAlertRepository alertRepository,
        IFieldEnvironmentalAlertEvaluator alertEvaluator,
        IFieldAreaCalculator fieldAreaCalculator,
        IDateTimeProvider dateTimeProvider,
        IOptions<GeospatialOptions> options,
        ILogger<FieldSpatialProfileService> logger)
    {
        _profileRepository = profileRepository;
        _fieldRepository = fieldRepository;
        _elevationProvider = elevationProvider;
        _landCoverProvider = landCoverProvider;
        _soilProvider = soilProvider;
        _protectedAreaProvider = protectedAreaProvider;
        _fireDetectionRepository = fireDetectionRepository;
        _weatherIntelligenceService = weatherIntelligenceService;
        _satelliteRepository = satelliteRepository;
        _alertRepository = alertRepository;
        _alertEvaluator = alertEvaluator;
        _fieldAreaCalculator = fieldAreaCalculator;
        _dateTimeProvider = dateTimeProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<FieldSpatialProfileDto?> GetProfileAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByFieldIdAsync(fieldId, cancellationToken);
        return profile == null ? null : GeospatialMapper.ToDto(profile);
    }

    public async Task<FieldIntelligenceSummaryDto> GetIntelligenceSummaryAsync(Field field, CancellationToken cancellationToken = default)
    {
        var profile = await _profileRepository.GetByFieldIdAsync(field.Id, cancellationToken);

        FieldWeatherDto? weather = null;
        try
        {
            weather = await _weatherIntelligenceService.GetFieldWeatherAsync(field, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Weather unavailable for intelligence summary of field {FieldId}", field.Id);
        }

        var alerts = await _alertRepository.GetActiveByFieldIdAsync(field.Id, cancellationToken);
        return new FieldIntelligenceSummaryDto
        {
            ProcessingStatus = (profile?.ProcessingStatus ?? GeospatialProcessingStatus.Pending).ToString().ToLowerInvariant(),
            Weather = weather,
            Terrain = GeospatialMapper.ToTerrainDto(profile?.TerrainSummary),
            LandCover = GeospatialMapper.ToLandCoverDto(profile?.LandCoverSummary),
            Soil = GeospatialMapper.ToSoilDto(profile?.SoilSummary),
            Vegetation = GeospatialMapper.ToSatelliteDto(profile?.LatestSatelliteSummary),
            Environment = GeospatialMapper.ToEnvironmentDto(profile?.EnvironmentalSummary),
            Alerts = alerts.Select(GeospatialMapper.ToAlertDto).ToList()
        };
    }

    public async Task ProcessFieldAsync(string fieldId, CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field?.Boundary == null)
        {
            _logger.LogDebug("Field {FieldId} has no boundary; nothing to process", fieldId);
            return;
        }

        var profile = await _profileRepository.GetByFieldIdAsync(fieldId, cancellationToken)
                      ?? new FieldSpatialProfile { FieldId = fieldId, Id = fieldId, CreatedAt = _dateTimeProvider.UtcNow };
        profile.ProcessingStatus = GeospatialProcessingStatus.Processing;
        profile.Version++;
        profile.UpdatedAt = _dateTimeProvider.UtcNow;
        await _profileRepository.UpsertAsync(profile, cancellationToken);

        var area = _fieldAreaCalculator.Calculate(field.Boundary);
        var centroidLat = area.CenterPoint.Coordinates[1];
        var centroidLng = area.CenterPoint.Coordinates[0];
        var bbox = GeoMath.BoundingBox(field.Boundary);

        profile.GeometrySummary = new GeometrySummary
        {
            AreaSqm = area.AreaSqm,
            CentroidLat = centroidLat,
            CentroidLng = centroidLng,
            BboxMinLng = bbox[0],
            BboxMinLat = bbox[1],
            BboxMaxLng = bbox[2],
            BboxMaxLat = bbox[3]
        };

        var failures = new List<string>();

        profile.TerrainSummary = await CollectAsync(
            "terrain", failures,
            async () => (await _elevationProvider.AnalyzeTerrainAsync(field.Boundary, fieldId, cancellationToken)).Summary,
            profile.TerrainSummary);

        profile.LandCoverSummary = await CollectAsync(
            "land cover", failures,
            async () => await _landCoverProvider.AnalyzeLandCoverAsync(field.Boundary, fieldId, cancellationToken),
            profile.LandCoverSummary);

        profile.SoilSummary = await CollectAsync(
            "soil", failures,
            async () => await _soilProvider.AnalyzeSoilAsync(field.Boundary, centroidLat, centroidLng, cancellationToken),
            profile.SoilSummary);

        profile.EnvironmentalSummary = await CollectAsync(
            "protected areas", failures,
            async () => await _protectedAreaProvider.AnalyzeProtectedAreasAsync(field.Boundary, centroidLat, centroidLng, cancellationToken),
            profile.EnvironmentalSummary);

        if (profile.EnvironmentalSummary != null)
        {
            profile.EnvironmentalSummary.ClosestFire = await CollectAsync(
                "fire detections", failures,
                async () =>
                {
                    var fires = await _fireDetectionRepository.GetRecentAsync(_dateTimeProvider.UtcNow.AddHours(-24), cancellationToken);
                    return FindClosestFire(fires, centroidLat, centroidLng, _options.Fires.SearchRadiusKm);
                },
                profile.EnvironmentalSummary.ClosestFire);
        }

        profile.LatestWeatherSummary = await CollectAsync(
            "weather", failures,
            async () => BuildWeatherSummary(await _weatherIntelligenceService.GetFieldWeatherAsync(field, cancellationToken)),
            profile.LatestWeatherSummary);

        profile.LatestSatelliteSummary = await CollectAsync(
            "satellite", failures,
            async () =>
            {
                var latest = await _satelliteRepository.GetLatestUsableAsync(fieldId, cancellationToken);
                return latest == null ? profile.LatestSatelliteSummary : BuildSatelliteSummary(latest);
            },
            profile.LatestSatelliteSummary);

        ApplyResolutionConfidence(profile, area.AreaSqm);

        profile.ProcessingStatus = failures.Count == 0
            ? GeospatialProcessingStatus.Completed
            : GeospatialProcessingStatus.Partial;
        profile.ProcessingError = failures.Count == 0 ? null : $"Unavailable sources: {string.Join(", ", failures)}";
        profile.CalculatedAt = _dateTimeProvider.UtcNow;
        profile.UpdatedAt = _dateTimeProvider.UtcNow;

        await _profileRepository.UpsertAsync(profile, cancellationToken);
        await _alertEvaluator.EvaluateAsync(field, profile, cancellationToken);

        _logger.LogInformation(
            "Spatial profile for field {FieldId} finished with status {Status} (v{Version})",
            fieldId, profile.ProcessingStatus, profile.Version);
    }

    /// <summary>
    /// Runs one provider call. On failure the previously stored value is kept, so a
    /// transient outage does not blank out data the farmer saw yesterday.
    /// </summary>
    private async Task<T?> CollectAsync<T>(string sourceName, List<string> failures, Func<Task<T?>> collect, T? previous)
    {
        try
        {
            return await collect() ?? previous;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Geospatial source {Source} failed; keeping previous value", sourceName);
            failures.Add(sourceName);
            return previous;
        }
    }

    /// <summary>
    /// Flags every summary whose source grid is coarse for this field. Small olive
    /// plots are smaller than a single SoilGrids or weather-model cell, and the value
    /// must not be presented as if it were measured on the plot.
    /// </summary>
    private static void ApplyResolutionConfidence(FieldSpatialProfile profile, double areaSqm)
    {
        Annotate(profile.TerrainSummary?.Metadata, FieldSizeVsResolutionService.CopernicusDemResolutionMetres, "Copernicus DEM");
        Annotate(profile.LandCoverSummary?.Metadata, FieldSizeVsResolutionService.WorldCoverResolutionMetres, "ESA WorldCover");
        Annotate(profile.SoilSummary?.Metadata, FieldSizeVsResolutionService.SoilGridsResolutionMetres, "SoilGrids");
        Annotate(profile.LatestSatelliteSummary?.Metadata, FieldSizeVsResolutionService.Sentinel2ResolutionMetres, "Sentinel-2");
        Annotate(profile.LatestWeatherSummary?.Metadata, FieldSizeVsResolutionService.OpenMeteoResolutionMetres, "the weather model");

        if (profile.SoilSummary != null)
        {
            profile.SoilSummary.IsRegionalEstimate = profile.SoilSummary.IsRegionalEstimate
                || FieldSizeVsResolutionService.IsCoarseRelativeToField(areaSqm, FieldSizeVsResolutionService.SoilGridsResolutionMetres);
        }

        void Annotate(DataSourceMetadata? metadata, double resolutionMetres, string datasetName)
        {
            if (metadata == null) return;

            var note = FieldSizeVsResolutionService.GetConfidenceNote(areaSqm, resolutionMetres, datasetName);
            if (string.IsNullOrEmpty(note)) return;

            metadata.IsRegionalEstimate = true;
            // A provider-supplied caveat is more specific, so it wins.
            metadata.ConfidenceNote = string.IsNullOrWhiteSpace(metadata.ConfidenceNote)
                ? note
                : metadata.ConfidenceNote;
        }
    }

    private static WeatherSummary BuildWeatherSummary(FieldWeatherDto weather) => new()
    {
        CurrentTemperatureC = weather.Current?.TemperatureC,
        RainNext24hMm = weather.Rain.Forecast24hMm,
        WindSpeedKmh = weather.Current?.WindSpeedKmh,
        FrostRiskLevel = weather.Frost.Level,
        FrostWindow = weather.Frost.Window,
        ForecastMinTempC = weather.Frost.ForecastMinTempC,
        ForecastMaxTempC = weather.Current?.HighC,
        Metadata = new Core.ValueObjects.Geospatial.DataSourceMetadata
        {
            Source = weather.Metadata.Source,
            SourceUrl = weather.Metadata.SourceUrl,
            Attribution = weather.Metadata.Attribution,
            Licence = weather.Metadata.Licence,
            SpatialResolution = weather.Metadata.SpatialResolution,
            TemporalResolution = weather.Metadata.TemporalResolution,
            ValueType = "modelled",
            LastUpdatedAt = weather.LastUpdatedAt
        }
    };

    private static SatelliteSummary BuildSatelliteSummary(FieldSatelliteObservation observation) => new()
    {
        LatestObservationId = observation.Id,
        ObservationDate = observation.ObservationDate,
        CloudCoverPercent = observation.CloudCoverPercent,
        NdviMean = observation.NdviStats?.Mean,
        NdviMedian = observation.NdviStats?.Median,
        NdviTrendLabel = DescribeNdviTrend(observation.NdviChangePercent),
        NdviChangePercent = observation.NdviChangePercent,
        AreaBelowBaselinePercent = observation.AreaDeclinePercent,
        NdmiMean = observation.NdmiStats?.Mean,
        Metadata = observation.Metadata
    };

    /// <summary>
    /// NDVI is only meaningful relative to the same field's own history, never as an
    /// absolute "health score", so the label is always phrased comparatively.
    /// </summary>
    private static string DescribeNdviTrend(double? changePercent) => changePercent switch
    {
        null => "No comparison available yet",
        < -5 => "Below normal for this field",
        > 5 => "Above field average",
        _ => "Near field average"
    };

    private static ClosestFireSummary? FindClosestFire(
        IReadOnlyList<FireDetection> fires,
        double lat,
        double lng,
        double searchRadiusKm)
    {
        FireDetection? closest = null;
        var shortestKm = double.MaxValue;

        foreach (var fire in fires)
        {
            var distanceKm = GeoMath.DistanceKm(lat, lng, fire.Latitude, fire.Longitude);
            if (distanceKm < shortestKm)
            {
                shortestKm = distanceKm;
                closest = fire;
            }
        }

        if (closest == null || shortestKm > searchRadiusKm) return null;

        return new ClosestFireSummary
        {
            DistanceKm = Math.Round(shortestKm, 1),
            Direction = GeoMath.ToCompass(GeoMath.BearingDegrees(lat, lng, closest.Latitude, closest.Longitude)),
            DetectedAt = closest.DetectedAt,
            Confidence = closest.Confidence
        };
    }
}
