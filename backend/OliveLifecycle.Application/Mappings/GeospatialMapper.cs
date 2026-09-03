using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Mappings;

public static class GeospatialMapper
{
    public static FieldSpatialProfileDto ToDto(FieldSpatialProfile profile) => new()
    {
        FieldId = profile.FieldId,
        ProcessingStatus = profile.ProcessingStatus.ToString().ToLowerInvariant(),
        ProcessingError = profile.ProcessingError,
        CalculatedAt = profile.CalculatedAt,
        Version = profile.Version,
        Geometry = profile.GeometrySummary == null ? null : new GeometrySummaryDto
        {
            AreaSqm = profile.GeometrySummary.AreaSqm,
            CentroidLat = profile.GeometrySummary.CentroidLat,
            CentroidLng = profile.GeometrySummary.CentroidLng,
            Bbox = [profile.GeometrySummary.BboxMinLng, profile.GeometrySummary.BboxMinLat, profile.GeometrySummary.BboxMaxLng, profile.GeometrySummary.BboxMaxLat]
        },
        Terrain = ToTerrainDto(profile.TerrainSummary),
        LandCover = ToLandCoverDto(profile.LandCoverSummary),
        Soil = ToSoilDto(profile.SoilSummary),
        Environment = ToEnvironmentDto(profile.EnvironmentalSummary),
        Satellite = ToSatelliteDto(profile.LatestSatelliteSummary),
        Weather = ToWeatherDto(profile.LatestWeatherSummary)
    };

    public static DataSourceMetadataDto ToMetadataDto(DataSourceMetadata m) => new()
    {
        Source = m.Source,
        SourceUrl = m.SourceUrl,
        Attribution = m.Attribution,
        Licence = m.Licence,
        SpatialResolution = m.SpatialResolution,
        TemporalResolution = m.TemporalResolution,
        ValueType = m.ValueType,
        SourceDate = m.SourceDate,
        LastUpdatedAt = m.LastUpdatedAt,
        IsRegionalEstimate = m.IsRegionalEstimate,
        ConfidenceNote = m.ConfidenceNote
    };

    public static TerrainSummaryDto? ToTerrainDto(TerrainSummary? t) => t == null ? null : new TerrainSummaryDto
    {
        MinElevationM = t.MinElevationM,
        MaxElevationM = t.MaxElevationM,
        AverageElevationM = t.AverageElevationM,
        MedianElevationM = t.MedianElevationM,
        ElevationRangeM = t.ElevationRangeM,
        AverageSlopePercent = t.AverageSlopePercent,
        MaxSlopePercent = t.MaxSlopePercent,
        AverageSlopeDegrees = t.AverageSlopeDegrees,
        MaxSlopeDegrees = t.MaxSlopeDegrees,
        DominantAspect = t.DominantAspect,
        DominantSlopeClass = t.DominantSlopeClass,
        SlopeZonePercent = t.SlopeZonePercent,
        SampleCount = t.SampleCount,
        Metadata = ToMetadataDto(t.Metadata)
    };

    public static LandCoverSummaryDto? ToLandCoverDto(LandCoverSummary? l) => l == null ? null : new LandCoverSummaryDto
    {
        DominantClass = l.DominantClass,
        PercentByClass = l.PercentByClass,
        Metadata = ToMetadataDto(l.Metadata)
    };

    public static SoilSummaryDto? ToSoilDto(SoilSummary? s) => s == null ? null : new SoilSummaryDto
    {
        Ph = s.Ph,
        ClayPercent = s.ClayPercent,
        SandPercent = s.SandPercent,
        SiltPercent = s.SiltPercent,
        OrganicCarbonPercent = s.OrganicCarbonPercent,
        IsRegionalEstimate = s.IsRegionalEstimate,
        Metadata = WithSoilDisclaimer(ToMetadataDto(s.Metadata), s.IsRegionalEstimate)
    };

    /// <summary>
    /// SoilGrids values are modelled at 250 m. Farmers must not read them as a lab result,
    /// so the disclaimer travels with the value rather than living only in the UI.
    /// </summary>
    private static DataSourceMetadataDto WithSoilDisclaimer(DataSourceMetadataDto metadata, bool isRegionalEstimate)
    {
        metadata.IsRegionalEstimate = metadata.IsRegionalEstimate == true || isRegionalEstimate;

        // A note already computed against this field's size is more specific, so keep it.
        if (metadata.IsRegionalEstimate == true && string.IsNullOrWhiteSpace(metadata.ConfidenceNote))
        {
            metadata.ConfidenceNote = "Regional soil estimate. Resolution: 250 m. Not a replacement for laboratory soil analysis.";
        }
        return metadata;
    }

    public static EnvironmentalSummaryDto? ToEnvironmentDto(EnvironmentalSummary? e) => e == null ? null : new EnvironmentalSummaryDto
    {
        IntersectsNatura = e.IntersectsNatura,
        DistanceToNearestNaturaKm = e.DistanceToNearestNaturaKm,
        NearestNaturaSite = e.NearestNaturaSite,
        NearestNaturaSiteCode = e.NearestNaturaSiteCode,
        NearestNaturaSiteType = e.NearestNaturaSiteType,
        ClosestFire = e.ClosestFire == null ? null : new ClosestFireDto
        {
            DistanceKm = e.ClosestFire.DistanceKm,
            Direction = e.ClosestFire.Direction,
            DetectedAt = e.ClosestFire.DetectedAt,
            Confidence = e.ClosestFire.Confidence
        },
        Metadata = ToMetadataDto(e.Metadata)
    };

    public static SatelliteSummaryDto? ToSatelliteDto(SatelliteSummary? s) => s == null ? null : new SatelliteSummaryDto
    {
        LatestObservationId = s.LatestObservationId,
        ObservationDate = s.ObservationDate,
        CloudCoverPercent = s.CloudCoverPercent,
        FieldCloudCoverPercent = s.FieldCloudCoverPercent,
        UsablePixelPercent = s.UsablePixelPercent,
        NdviMean = s.NdviMean,
        NdviMedian = s.NdviMedian,
        NdviTrendLabel = s.NdviTrendLabel,
        NdviChangePercent = s.NdviChangePercent,
        ComparedToObservationDate = s.ComparedToObservationDate,
        AreaBelowBaselinePercent = s.AreaBelowBaselinePercent,
        NdmiMean = s.NdmiMean,
        NdreMean = s.NdreMean,
        NdwiMean = s.NdwiMean,
        SaviMean = s.SaviMean,
        Metadata = ToMetadataDto(s.Metadata)
    };

    public static WeatherSummaryDto? ToWeatherDto(WeatherSummary? w) => w == null ? null : new WeatherSummaryDto
    {
        CurrentTemperatureC = w.CurrentTemperatureC,
        RainNext24hMm = w.RainNext24hMm,
        WindSpeedKmh = w.WindSpeedKmh,
        FrostRiskLevel = w.FrostRiskLevel,
        FrostWindow = w.FrostWindow,
        ForecastMinTempC = w.ForecastMinTempC,
        ForecastMaxTempC = w.ForecastMaxTempC,
        Metadata = ToMetadataDto(w.Metadata)
    };

    public static FieldEnvironmentalAlertDto ToAlertDto(FieldEnvironmentalAlert alert) => new()
    {
        Id = alert.Id,
        AlertType = alert.AlertType.ToString(),
        Severity = alert.Severity,
        Title = alert.Title,
        Message = alert.Message,
        ValidFrom = alert.ValidFrom,
        ValidTo = alert.ValidTo,
        Confidence = alert.Confidence.ToString(),
        RelatedTaskId = alert.RelatedTaskId
    };

    public static VegetationIndexStatsDto? ToStatsDto(VegetationIndexStats? stats, string? trendLabel = null)
        => stats == null ? null : new VegetationIndexStatsDto
        {
            Mean = stats.Mean,
            Median = stats.Median,
            Minimum = stats.Minimum,
            Maximum = stats.Maximum,
            StandardDeviation = stats.StandardDeviation,
            P10 = stats.P10,
            P90 = stats.P90,
            ValidPixelCount = stats.ValidPixelCount,
            TrendLabel = trendLabel
        };

    public static FieldSatelliteObservationDto ToObservationDto(FieldSatelliteObservation obs, Func<string?, string?> urlResolver) => new()
    {
        Id = obs.Id,
        FieldId = obs.FieldId,
        ObservationDate = obs.ObservationDate,
        CloudCoverPercent = obs.CloudCoverPercent,
        FieldCloudCoverPercent = obs.FieldCloudCoverPercent,
        UsablePixelPercent = obs.UsablePixelPercent,
        IsUsable = obs.IsUsable,
        Source = obs.Source,
        Resolution = obs.Resolution,
        Ndvi = ToStatsDto(obs.NdviStats),
        Ndmi = ToStatsDto(obs.NdmiStats),
        Ndre = ToStatsDto(obs.NdreStats),
        Ndwi = ToStatsDto(obs.NdwiStats),
        Savi = ToStatsDto(obs.SaviStats),
        NdviChangePercent = obs.NdviChangePercent,
        ComparedToObservationDate = obs.ComparedToObservationDate,
        AreaDeclinePercent = obs.AreaDeclinePercent,
        AreaIncreasePercent = obs.AreaIncreasePercent,
        AreaBelowBaselinePercent = obs.AreaBelowBaselinePercent,
        TrueColorUrl = urlResolver(obs.TrueColorStoragePath),
        NdviUrl = urlResolver(obs.NdviStoragePath),
        NdmiUrl = urlResolver(obs.NdmiStoragePath),
        NdreUrl = urlResolver(obs.NdreStoragePath),
        NdwiUrl = urlResolver(obs.NdwiStoragePath),
        SaviUrl = urlResolver(obs.SaviStoragePath),
        NdviChangeUrl = urlResolver(obs.NdviChangeStoragePath),
        OverlayBounds = obs.OverlayBounds,
        Metadata = ToMetadataDto(obs.Metadata)
    };

    public static SatelliteDateDto ToSatelliteDateDto(FieldSatelliteObservation obs) => new()
    {
        ObservationId = obs.Id,
        ObservationDate = obs.ObservationDate,
        CloudCoverPercent = obs.CloudCoverPercent,
        FieldCloudCoverPercent = obs.FieldCloudCoverPercent,
        UsablePixelPercent = obs.UsablePixelPercent,
        IsUsable = obs.IsUsable,
        NdviMean = obs.NdviStats?.Mean,
        HasTrueColor = obs.TrueColorStoragePath != null,
        HasNdvi = obs.NdviStoragePath != null
    };
}
