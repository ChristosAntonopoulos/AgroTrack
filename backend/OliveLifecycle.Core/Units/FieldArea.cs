namespace OliveLifecycle.Core.Units;

/// <summary>
/// Canonical field area is square metres. Stored <see cref="Entities.Field.Area"/> is hectares.
/// <see cref="Entities.Field.AppMeasuredAreaSqm"/> and cadastre official area are already m².
/// </summary>
public static class FieldArea
{
    public const double SquareMetresPerHectare = 10_000d;
    public const double SquareMetresPerStremma = 1_000d;

    public static double SqmFromHectares(double hectares) => hectares * SquareMetresPerHectare;

    public static double HectaresFromSqm(double sqm) => sqm / SquareMetresPerHectare;

    public static double StremmataFromSqm(double sqm) => sqm / SquareMetresPerStremma;

    /// <summary>
    /// Resolve area in m² without inferring the unit from magnitude.
    /// Preference: measured polygon → cadastre official → legacy <c>Area</c> (hectares).
    /// </summary>
    public static double? ResolveSqm(
        double areaHectares,
        double? appMeasuredAreaSqm,
        double? officialAreaSqm)
    {
        if (appMeasuredAreaSqm is > 0)
        {
            return appMeasuredAreaSqm.Value;
        }

        if (officialAreaSqm is > 0)
        {
            return officialAreaSqm.Value;
        }

        if (areaHectares > 0)
        {
            return SqmFromHectares(areaHectares);
        }

        return null;
    }

    public static double? ResolveHectares(
        double areaHectares,
        double? appMeasuredAreaSqm,
        double? officialAreaSqm)
    {
        var sqm = ResolveSqm(areaHectares, appMeasuredAreaSqm, officialAreaSqm);
        return sqm is > 0 ? HectaresFromSqm(sqm.Value) : null;
    }

    /// <summary>
    /// True when <paramref name="storedArea"/> was written as m² (same quantity as a known m² value).
    /// Used to correct legacy rows without guessing from magnitude alone.
    /// </summary>
    public static bool AreaMatchesSqm(double storedArea, double sqm, double relativeTolerance = 0.005)
    {
        if (storedArea <= 0 || sqm <= 0)
        {
            return false;
        }

        var delta = Math.Abs(storedArea - sqm);
        return delta <= Math.Max(1d, sqm * relativeTolerance);
    }

    /// <summary>
    /// If Area was stored as m² (equals a known m² field), convert Area to hectares in place.
    /// Does not change AppMeasuredAreaSqm or cadastre values.
    /// </summary>
    public static bool TryNormalizeStoredHectares(
        ref double area,
        double? appMeasuredAreaSqm,
        double? officialAreaSqm)
    {
        var knownSqm = appMeasuredAreaSqm is > 0 ? appMeasuredAreaSqm : officialAreaSqm is > 0 ? officialAreaSqm : null;
        if (knownSqm is not > 0)
        {
            return false;
        }

        if (!AreaMatchesSqm(area, knownSqm.Value))
        {
            return false;
        }

        area = HectaresFromSqm(knownSqm.Value);
        return true;
    }
}
