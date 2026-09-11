using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Infrastructure.Persistence.Documents.Geospatial;

public class FieldSpatialProfileDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public int Version { get; set; }
    public string ProcessingStatus { get; set; } = string.Empty;
    public string? ProcessingError { get; set; }
    public DateTime? CalculatedAt { get; set; }
    public BsonDocument? GeometrySummary { get; set; }
    public BsonDocument? TerrainSummary { get; set; }
    public BsonDocument? LandCoverSummary { get; set; }
    public BsonDocument? SoilSummary { get; set; }
    public BsonDocument? EnvironmentalSummary { get; set; }
    public BsonDocument? LatestSatelliteSummary { get; set; }
    public BsonDocument? LatestWeatherSummary { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WeatherCacheLocationDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string GridKey { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? Model { get; set; }
    public DateTime FetchedAt { get; set; }
    public DateTime ValidFrom { get; set; }
    public DateTime ValidTo { get; set; }
    public List<BsonDocument> HourlyForecast { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FieldDailyWeatherSnapshotDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double? AverageTemperatureC { get; set; }
    public double? MinHumidityPercent { get; set; }
    public double? MaxHumidityPercent { get; set; }
    public double? AverageHumidityPercent { get; set; }
    public double? RainTotalMm { get; set; }
    public double? MaximumWindSpeedKmh { get; set; }
    public double? AverageWindSpeedKmh { get; set; }
    public double? MaximumWindGustKmh { get; set; }
    public double? Et0Mm { get; set; }
    public double? SolarRadiationWm2 { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? Model { get; set; }
    public string? SourceResolution { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FieldSatelliteObservationDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string CatalogItemId { get; set; } = string.Empty;
    public DateTime ObservationDate { get; set; }
    public double CloudCoverPercent { get; set; }
    public double? FieldCloudCoverPercent { get; set; }
    public double? UsablePixelPercent { get; set; }
    public bool IsUsable { get; set; } = true;
    public string Source { get; set; } = string.Empty;
    public string Resolution { get; set; } = string.Empty;
    public string? TrueColorStoragePath { get; set; }
    public string? NdviStoragePath { get; set; }
    public string? NdmiStoragePath { get; set; }
    public string? NdreStoragePath { get; set; }
    public string? NdwiStoragePath { get; set; }
    public string? SaviStoragePath { get; set; }
    public string? NdviChangeStoragePath { get; set; }
    public double[]? OverlayBounds { get; set; }
    public BsonDocument? NdviStats { get; set; }
    public BsonDocument? NdmiStats { get; set; }
    public BsonDocument? NdreStats { get; set; }
    public BsonDocument? NdwiStats { get; set; }
    public BsonDocument? SaviStats { get; set; }
    public double? NdviChangePercent { get; set; }
    public string? ComparedToObservationId { get; set; }
    public DateTime? ComparedToObservationDate { get; set; }
    public double? AreaDeclinePercent { get; set; }
    public double? AreaIncreasePercent { get; set; }
    public double? AreaBelowBaselinePercent { get; set; }
    public BsonDocument? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FieldWeatherPeriodReviewDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string PeriodType { get; set; } = "month";
    public int Year { get; set; }
    public int? Month { get; set; }
    public DateTime OccurredAt { get; set; }
    public double RainTotalMm { get; set; }
    public double? MinTemperatureC { get; set; }
    public double? MaxTemperatureC { get; set; }
    public double? AverageTemperatureC { get; set; }
    public int FrostNights { get; set; }
    public int HeatDays { get; set; }
    public int HeavyRainDays { get; set; }
    public int LongestDryStreakDays { get; set; }
    public int RainyDays { get; set; }
    public int DryDays { get; set; }
    public double? Et0TotalMm { get; set; }
    public double? WaterBalanceMm { get; set; }
    public double? AverageHumidityPercent { get; set; }
    public double? MaxWindGustKmh { get; set; }
    public double? RainVsPreviousPercent { get; set; }
    public int? WettestMonth { get; set; }
    public double? NdviMean { get; set; }
    public double? NdviDeltaPercent { get; set; }
    public double? NdviStartEndDeltaPercent { get; set; }
    public double? NdmiMean { get; set; }
    public double? NdreMean { get; set; }
    public double? NdwiMean { get; set; }
    public double? SaviMean { get; set; }
    public WeatherReviewSatelliteScene? OpeningScene { get; set; }
    public WeatherReviewSatelliteScene? ClosingScene { get; set; }
    public List<WeatherPeriodInsight> Insights { get; set; } = new();
    public List<double> RainSeries { get; set; } = new();
    public List<string> RainLabels { get; set; } = new();
    public List<double?> TemperatureMinSeries { get; set; } = new();
    public List<double?> TemperatureMaxSeries { get; set; } = new();
    public int DayCount { get; set; }
    public int ExpectedDays { get; set; }
    public int DaysWithRainData { get; set; }
    public bool IncludesForecast { get; set; }
    public int UsableSatelliteCount { get; set; }
    public string WeatherProvider { get; set; } = string.Empty;
    public string? SatelliteSource { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FieldEnvironmentalAlertDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string FieldId { get; set; } = string.Empty;
    public string DedupKey { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? RelatedTaskId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FireDetectionDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public DateTime DetectedAt { get; set; }
    public string? Confidence { get; set; }
    public double? BrightnessKelvin { get; set; }
    public double? FireRadiativePowerMw { get; set; }
    public string? Satellite { get; set; }
    public string? DayNight { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class NaturaSiteDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string SiteCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? SiteType { get; set; }
    public double CentroidLat { get; set; }
    public double CentroidLng { get; set; }
    public double[] Bbox { get; set; } = [];
    public List<List<List<double>>> Rings { get; set; } = [];
    public double? AreaHectares { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateTime? SourceDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class DataSourceHealthDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string SourceId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? LastSuccessfulUpdate { get; set; }
    public string? LastError { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class GeospatialProcessingJobDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public string JobType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? IdempotencyKey { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
