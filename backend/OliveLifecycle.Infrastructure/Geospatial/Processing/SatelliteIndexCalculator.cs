namespace OliveLifecycle.Infrastructure.Geospatial.Processing;

/// <summary>
/// Sentinel-2 Scene Classification Layer values. Masking decisions are expressed
/// against these rather than magic numbers so the intent stays reviewable.
/// </summary>
public enum SceneClass
{
    NoData = 0,
    SaturatedOrDefective = 1,
    CastShadow = 2,
    CloudShadow = 3,
    Vegetation = 4,
    NotVegetated = 5,
    Water = 6,
    Unclassified = 7,
    CloudMediumProbability = 8,
    CloudHighProbability = 9,
    ThinCirrus = 10,
    SnowOrIce = 11
}

public sealed class BandMaskResult
{
    /// <summary>True where the pixel is inside the field and free of cloud, shadow and snow.</summary>
    public required bool[] Usable { get; init; }

    public required int InsideFieldPixels { get; init; }
    public required int UsablePixels { get; init; }

    /// <summary>Pixels obscured by cloud, cirrus, cloud shadow or snow.</summary>
    public required int ObscuredPixels { get; init; }

    public double UsablePercent => InsideFieldPixels == 0 ? 0 : Math.Round(UsablePixels * 100.0 / InsideFieldPixels, 1);

    public double ObscuredPercent => InsideFieldPixels == 0 ? 0 : Math.Round(ObscuredPixels * 100.0 / InsideFieldPixels, 1);
}

/// <summary>
/// Pure vegetation index maths over aligned reflectance grids. Kept separate from
/// the orchestration service so the arithmetic and masking rules are unit testable
/// without any network or storage involvement.
/// </summary>
public static class SatelliteIndexCalculator
{
    /// <summary>Soil adjustment factor for SAVI, the standard value for partial canopy cover.</summary>
    private const double SaviSoilFactor = 0.5;

    /// <summary>Classes that make a pixel unusable for index statistics.</summary>
    private static readonly SceneClass[] UnusableClasses =
    [
        SceneClass.NoData,
        SceneClass.SaturatedOrDefective,
        SceneClass.CastShadow,
        SceneClass.CloudShadow,
        SceneClass.CloudMediumProbability,
        SceneClass.CloudHighProbability,
        SceneClass.ThinCirrus,
        SceneClass.SnowOrIce
    ];

    /// <summary>Subset of unusable classes attributable to cloud, cirrus or snow cover.</summary>
    private static readonly SceneClass[] ObscuringClasses =
    [
        SceneClass.CloudShadow,
        SceneClass.CloudMediumProbability,
        SceneClass.CloudHighProbability,
        SceneClass.ThinCirrus,
        SceneClass.SnowOrIce
    ];

    /// <summary>
    /// Combines the field boundary mask with the scene classification layer.
    /// When no classification band is available every in-boundary pixel is treated
    /// as usable and the obscured count is reported as zero, which the caller
    /// records as reduced confidence rather than a clear sky.
    /// </summary>
    public static BandMaskResult BuildMask(bool[] insideField, double[]? sceneClassification)
    {
        var usable = new bool[insideField.Length];
        var inside = 0;
        var usableCount = 0;
        var obscured = 0;

        for (var i = 0; i < insideField.Length; i++)
        {
            if (!insideField[i])
            {
                continue;
            }

            inside++;

            if (sceneClassification == null)
            {
                usable[i] = true;
                usableCount++;
                continue;
            }

            var raw = sceneClassification[i];
            if (double.IsNaN(raw))
            {
                continue;
            }

            var sceneClass = (SceneClass)(int)Math.Round(raw);

            if (Array.IndexOf(ObscuringClasses, sceneClass) >= 0)
            {
                obscured++;
            }

            if (Array.IndexOf(UnusableClasses, sceneClass) >= 0)
            {
                continue;
            }

            usable[i] = true;
            usableCount++;
        }

        return new BandMaskResult
        {
            Usable = usable,
            InsideFieldPixels = inside,
            UsablePixels = usableCount,
            ObscuredPixels = obscured
        };
    }

    /// <summary>
    /// Converts Sentinel-2 L2A digital numbers to surface reflectance. Non-positive
    /// digital numbers mean "no observation" in the L2A product and become NaN.
    /// </summary>
    public static double[] ToReflectance(double[] digitalNumbers, double scale, double offset)
    {
        var reflectance = new double[digitalNumbers.Length];

        for (var i = 0; i < digitalNumbers.Length; i++)
        {
            var dn = digitalNumbers[i];
            reflectance[i] = double.IsNaN(dn) || dn <= 0
                ? double.NaN
                : (dn + offset) / scale;
        }

        return reflectance;
    }

    /// <summary>Normalised difference of two bands, masked to usable pixels.</summary>
    public static double[] NormalisedDifference(double[] first, double[] second, bool[] usable)
    {
        var result = new double[usable.Length];

        for (var i = 0; i < result.Length; i++)
        {
            result[i] = double.NaN;

            if (!usable[i] || i >= first.Length || i >= second.Length)
            {
                continue;
            }

            var a = first[i];
            var b = second[i];
            if (double.IsNaN(a) || double.IsNaN(b))
            {
                continue;
            }

            var denominator = a + b;
            if (Math.Abs(denominator) < 1e-9)
            {
                continue;
            }

            var value = (a - b) / denominator;

            // Normalised differences are bounded; anything outside signals bad input.
            if (value is >= -1 and <= 1)
            {
                result[i] = value;
            }
        }

        return result;
    }

    public static double[] Ndvi(double[] nir, double[] red, bool[] usable) => NormalisedDifference(nir, red, usable);

    public static double[] Ndmi(double[] nir, double[] swir, bool[] usable) => NormalisedDifference(nir, swir, usable);

    public static double[] Ndre(double[] nir, double[] redEdge, bool[] usable) => NormalisedDifference(nir, redEdge, usable);

    /// <summary>McFeeters water index: positive values indicate open water.</summary>
    public static double[] Ndwi(double[] green, double[] nir, bool[] usable) => NormalisedDifference(green, nir, usable);

    /// <summary>
    /// Soil Adjusted Vegetation Index. Preferred over NDVI on sparse olive canopies
    /// where a large share of each pixel is bare ground between trees.
    /// </summary>
    public static double[] Savi(double[] nir, double[] red, bool[] usable)
    {
        var result = new double[usable.Length];

        for (var i = 0; i < result.Length; i++)
        {
            result[i] = double.NaN;

            if (!usable[i] || i >= nir.Length || i >= red.Length)
            {
                continue;
            }

            var n = nir[i];
            var r = red[i];
            if (double.IsNaN(n) || double.IsNaN(r))
            {
                continue;
            }

            var denominator = n + r + SaviSoilFactor;
            if (Math.Abs(denominator) < 1e-9)
            {
                continue;
            }

            var value = (n - r) / denominator * (1 + SaviSoilFactor);
            if (value is >= -1.5 and <= 1.5)
            {
                result[i] = value;
            }
        }

        return result;
    }

    /// <summary>
    /// Pixel-wise difference between two index grids of identical shape. Used for
    /// change maps, which need co-registered grids rather than summary statistics.
    /// </summary>
    public static double[] Difference(double[] current, double[] previous)
    {
        var length = Math.Min(current.Length, previous.Length);
        var result = new double[length];

        for (var i = 0; i < length; i++)
        {
            result[i] = double.IsNaN(current[i]) || double.IsNaN(previous[i])
                ? double.NaN
                : current[i] - previous[i];
        }

        return result;
    }
}
