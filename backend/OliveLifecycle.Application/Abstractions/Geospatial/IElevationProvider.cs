using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Application.Abstractions.Geospatial;

public class TerrainAnalysisResult
{
    public TerrainSummary Summary { get; set; } = new();
    public string? HillshadeStoragePath { get; set; }
}

public interface IElevationProvider
{
    string ProviderName { get; }
    Task<TerrainAnalysisResult> AnalyzeTerrainAsync(GeoJsonPolygon boundary, string fieldId, CancellationToken cancellationToken = default);
}
