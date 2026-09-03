using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Abstractions.Geospatial;

public interface ILandCoverProvider
{
    string ProviderName { get; }
    Task<LandCoverSummary> AnalyzeLandCoverAsync(GeoJsonPolygon boundary, string fieldId, CancellationToken cancellationToken = default);
}
