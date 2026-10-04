namespace OliveLifecycle.Application.Abstractions.Geospatial;

public interface IGeospatialJobQueue
{
    Task EnqueueSpatialProfileAsync(string fieldId, CancellationToken cancellationToken = default);
    Task EnqueueSatelliteProcessingAsync(string fieldId, string? catalogItemId = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Pulls multi-year weather and monthly Sentinel-2 history once the field has a boundary
    /// (queued on boundary save, or on activation when the boundary already exists).
    /// </summary>
    Task EnqueueFieldHistoryBackfillAsync(string fieldId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-checks the weather conditions of every upcoming task on a field. Queued rather
    /// than run inline so creating a task never waits on a forecast request.
    /// </summary>
    Task EnqueueTaskConditionsAsync(string fieldId, CancellationToken cancellationToken = default);
}
