namespace OliveLifecycle.Application.Services.Geospatial;

/// <summary>
/// Decides whether a dataset's ground resolution is too coarse to describe a
/// particular field. A 250 m soil grid over a 0.4 ha plot is a regional estimate,
/// not a measurement of that plot, and the UI has to say so.
/// </summary>
public static class FieldSizeVsResolutionService
{
    /// <summary>Native ground resolution, in metres, of each dataset the platform reads.</summary>
    public const double CopernicusDemResolutionMetres = 30;
    public const double WorldCoverResolutionMetres = 10;
    public const double SoilGridsResolutionMetres = 250;
    public const double Sentinel2ResolutionMetres = 10;
    public const double OpenMeteoResolutionMetres = 11000;

    /// <summary>
    /// True when fewer than roughly four source pixels cover the field, meaning the
    /// value is dominated by land outside the boundary.
    /// </summary>
    public static bool IsCoarseRelativeToField(double fieldAreaSqm, double resolutionMeters)
    {
        if (fieldAreaSqm <= 0 || resolutionMeters <= 0) return false;
        var fieldDiameter = Math.Sqrt(fieldAreaSqm);
        return fieldDiameter < resolutionMeters * 2;
    }

    /// <summary>Approximate number of source pixels covering the field.</summary>
    public static double PixelsAcrossField(double fieldAreaSqm, double resolutionMeters)
    {
        if (fieldAreaSqm <= 0 || resolutionMeters <= 0) return 0;
        return Math.Sqrt(fieldAreaSqm) / resolutionMeters;
    }

    public static string GetConfidenceNote(double fieldAreaSqm, double resolutionMeters, string datasetName)
    {
        if (!IsCoarseRelativeToField(fieldAreaSqm, resolutionMeters)) return string.Empty;

        var across = PixelsAcrossField(fieldAreaSqm, resolutionMeters);
        return $"Regional estimate — {datasetName} has {resolutionMeters:0.#} m resolution, " +
               $"about {across:0.#} pixels across this field, so the value includes surrounding land.";
    }
}
