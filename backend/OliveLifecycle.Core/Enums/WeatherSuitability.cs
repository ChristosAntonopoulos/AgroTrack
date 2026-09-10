namespace OliveLifecycle.Core.Enums;

public enum WeatherSuitability
{
    Good,
    Caution,
    Unsuitable,
    Unknown
}

public static class WeatherSuitabilityExtensions
{
    public static string ToApiString(this WeatherSuitability suitability) => suitability switch
    {
        WeatherSuitability.Good => "good",
        WeatherSuitability.Caution => "caution",
        WeatherSuitability.Unsuitable => "unsuitable",
        _ => "unknown"
    };

    public static WeatherSuitability FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "good" => WeatherSuitability.Good,
        "caution" => WeatherSuitability.Caution,
        "unsuitable" => WeatherSuitability.Unsuitable,
        _ => WeatherSuitability.Unknown
    };
}
