using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Abstractions.Persistence;

public interface IFieldSpatialProfileRepository
{
    Task<FieldSpatialProfile?> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<FieldSpatialProfile> UpsertAsync(FieldSpatialProfile profile, CancellationToken cancellationToken = default);
}

public interface IWeatherCacheRepository
{
    Task<WeatherCacheLocation?> GetByGridKeyAsync(string gridKey, CancellationToken cancellationToken = default);
    Task<WeatherCacheLocation> UpsertAsync(WeatherCacheLocation location, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WeatherCacheLocation>> GetStaleLocationsAsync(DateTime olderThan, CancellationToken cancellationToken = default);
}

public interface IFieldDailyWeatherSnapshotRepository
{
    Task<FieldDailyWeatherSnapshot?> GetByFieldAndDateAsync(string fieldId, DateOnly date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldDailyWeatherSnapshot>> GetHistoryAsync(string fieldId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<FieldDailyWeatherSnapshot> UpsertAsync(FieldDailyWeatherSnapshot snapshot, CancellationToken cancellationToken = default);
}

public interface IFieldSatelliteObservationRepository
{
    Task<FieldSatelliteObservation?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FieldSatelliteObservation>> GetByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<FieldSatelliteObservation?> GetLatestUsableAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<FieldSatelliteObservation?> GetPreviousUsableAsync(string fieldId, DateTime beforeDate, CancellationToken cancellationToken = default);

    /// <summary>Used to skip catalogue items that have already been processed for a field.</summary>
    Task<FieldSatelliteObservation?> GetByCatalogItemAsync(string fieldId, string catalogItemId, CancellationToken cancellationToken = default);

    /// <summary>Usable observations within a date range, ordered oldest first, for baselines and seasonal comparison.</summary>
    Task<IReadOnlyList<FieldSatelliteObservation>> GetUsableInRangeAsync(string fieldId, DateTime from, DateTime to, CancellationToken cancellationToken = default);

    Task<FieldSatelliteObservation> CreateAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken = default);
    Task<FieldSatelliteObservation> UpdateAsync(FieldSatelliteObservation observation, CancellationToken cancellationToken = default);

    /// <summary>Removes observations older than the retention window and returns them so their rasters can be deleted.</summary>
    Task<IReadOnlyList<FieldSatelliteObservation>> DeleteOlderThanAsync(DateTime cutoff, CancellationToken cancellationToken = default);
}

public interface IFieldEnvironmentalAlertRepository
{
    Task<IReadOnlyList<FieldEnvironmentalAlert>> GetActiveByFieldIdAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<FieldEnvironmentalAlert?> GetByDedupKeyAsync(string dedupKey, CancellationToken cancellationToken = default);
    Task<FieldEnvironmentalAlert> UpsertAsync(FieldEnvironmentalAlert alert, CancellationToken cancellationToken = default);

    /// <summary>Withdraws a single alert whose condition no longer holds.</summary>
    Task DeactivateAsync(string alertId, CancellationToken cancellationToken = default);

    Task DeactivateExpiredAsync(DateTime now, CancellationToken cancellationToken = default);
}

public interface IFireDetectionRepository
{
    Task ReplaceAllAsync(IReadOnlyList<FireDetection> detections, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FireDetection>> GetRecentAsync(DateTime since, CancellationToken cancellationToken = default);
}

public interface INaturaSiteRepository
{
    Task<IReadOnlyList<NaturaSite>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<NaturaSite> UpsertAsync(NaturaSite site, CancellationToken cancellationToken = default);
    Task ReplaceAllAsync(IReadOnlyList<NaturaSite> sites, CancellationToken cancellationToken = default);
    Task<long> CountAsync(CancellationToken cancellationToken = default);
}

public interface IDataSourceHealthRepository
{
    Task<IReadOnlyList<DataSourceHealth>> GetAllAsync(CancellationToken cancellationToken = default);
    Task UpsertAsync(DataSourceHealth health, CancellationToken cancellationToken = default);
}

public interface IGeospatialProcessingJobRepository
{
    Task<GeospatialProcessingJob?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<GeospatialProcessingJob?> GetByIdempotencyKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<GeospatialProcessingJob> CreateAsync(GeospatialProcessingJob job, CancellationToken cancellationToken = default);
    Task UpdateAsync(GeospatialProcessingJob job, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GeospatialProcessingJob>> GetPendingAsync(int limit, CancellationToken cancellationToken = default);

    /// <summary>Job counts per status, for the admin view of the processing queues.</summary>
    Task<IReadOnlyDictionary<GeospatialProcessingStatus, long>> CountByStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>Most recent failures, so an admin can see what is actually going wrong.</summary>
    Task<IReadOnlyList<GeospatialProcessingJob>> GetRecentFailuresAsync(int limit, CancellationToken cancellationToken = default);
}
