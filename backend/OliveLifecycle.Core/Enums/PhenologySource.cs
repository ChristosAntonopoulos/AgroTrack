namespace OliveLifecycle.Core.Enums;

public enum PhenologySource
{
    User,
    Agronomist,
    WeatherModel,
    SystemEstimate
}

public static class PhenologySourceExtensions
{
    public static string ToApiString(this PhenologySource source) => source switch
    {
        PhenologySource.Agronomist => "agronomist",
        PhenologySource.WeatherModel => "weather_model",
        PhenologySource.SystemEstimate => "system_estimate",
        _ => "user"
    };

    public static PhenologySource? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "user" => PhenologySource.User,
        "agronomist" => PhenologySource.Agronomist,
        "weather_model" => PhenologySource.WeatherModel,
        "system_estimate" => PhenologySource.SystemEstimate,
        _ => null
    };

    /// <summary>User or agronomist observations override system estimates.</summary>
    public static bool OverridesSystemEstimate(this PhenologySource source) =>
        source is PhenologySource.User or PhenologySource.Agronomist;
}
