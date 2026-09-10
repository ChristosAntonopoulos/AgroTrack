namespace OliveLifecycle.Core.Enums;

public enum ProposalSourceType
{
    SeasonalBaseline,
    FieldObservation,
    WeatherRule,
    OfficialWarning,
    Agronomist,
    UserCreated,
    PreviousYearPattern
}

public static class ProposalSourceTypeExtensions
{
    public static string ToApiString(this ProposalSourceType source) => source switch
    {
        ProposalSourceType.FieldObservation => "field_observation",
        ProposalSourceType.WeatherRule => "weather_rule",
        ProposalSourceType.OfficialWarning => "official_warning",
        ProposalSourceType.Agronomist => "agronomist",
        ProposalSourceType.UserCreated => "user_created",
        ProposalSourceType.PreviousYearPattern => "previous_year_pattern",
        _ => "seasonal_baseline"
    };

    public static ProposalSourceType? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "seasonal_baseline" => ProposalSourceType.SeasonalBaseline,
        "field_observation" => ProposalSourceType.FieldObservation,
        "weather_rule" => ProposalSourceType.WeatherRule,
        "official_warning" => ProposalSourceType.OfficialWarning,
        "agronomist" => ProposalSourceType.Agronomist,
        "user_created" => ProposalSourceType.UserCreated,
        "previous_year_pattern" => ProposalSourceType.PreviousYearPattern,
        _ => null
    };

    /// <summary>
    /// Official warning and agronomist sources outrank generic seasonal rules.
    /// </summary>
    public static int Precedence(this ProposalSourceType source) => source switch
    {
        ProposalSourceType.OfficialWarning => 100,
        ProposalSourceType.Agronomist => 90,
        ProposalSourceType.FieldObservation => 70,
        ProposalSourceType.WeatherRule => 60,
        ProposalSourceType.PreviousYearPattern => 40,
        ProposalSourceType.UserCreated => 30,
        _ => 20
    };
}
