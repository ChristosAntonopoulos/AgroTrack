using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Abstractions.Geospatial;

public interface ISoilProvider
{
    string ProviderName { get; }
    Task<SoilSummary> AnalyzeSoilAsync(GeoJsonPolygon boundary, double centroidLat, double centroidLng, CancellationToken cancellationToken = default);
}
