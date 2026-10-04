namespace OliveLifecycle.Core.Units;

/// <summary>
/// Shared rounding for grove olive/oil mass. Litres are a separate measure — never pass oil kg here as litres.
/// </summary>
public static class GroveMass
{
    /// <summary>
    /// Round to at most one decimal place (exact integers stay integers).
    /// </summary>
    public static double RoundKg(double kg) =>
        Math.Round(kg, 1, MidpointRounding.AwayFromZero);

    public static double? RoundKg(double? kg) =>
        kg is null ? null : RoundKg(kg.Value);

    public static decimal RoundKg(decimal kg) =>
        Math.Round(kg, 1, MidpointRounding.AwayFromZero);

    public static decimal? RoundKg(decimal? kg) =>
        kg is null ? null : RoundKg(kg.Value);
}
