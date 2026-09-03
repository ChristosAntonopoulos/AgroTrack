using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Abstractions.Geospatial;

public interface IProtectedAreaProvider
{
    string ProviderName { get; }
    Task<EnvironmentalSummary> AnalyzeProtectedAreasAsync(GeoJsonPolygon boundary, double centroidLat, double centroidLng, CancellationToken cancellationToken = default);
}
