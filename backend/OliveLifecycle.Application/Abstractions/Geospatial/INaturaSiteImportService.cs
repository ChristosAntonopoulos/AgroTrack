namespace OliveLifecycle.Application.Abstractions.Geospatial;

public class NaturaImportResult
{
    public int SitesImported { get; set; }
    public int SitesSkipped { get; set; }
    public List<string> Warnings { get; set; } = [];
}

/// <summary>
/// Loads Natura 2000 protected area boundaries from an official GeoJSON export.
/// Runs as an administrative action rather than a scheduled job, because the
/// dataset changes at most once a year.
/// </summary>
public interface INaturaSiteImportService
{
    Task<NaturaImportResult> ImportFromGeoJsonAsync(Stream geoJsonStream, CancellationToken cancellationToken = default);
}
