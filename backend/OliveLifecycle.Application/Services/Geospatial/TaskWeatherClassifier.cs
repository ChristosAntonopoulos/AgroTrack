namespace OliveLifecycle.Application.Services.Geospatial;

/// <summary>Groups of field work whose outcome depends on the weather.</summary>
public enum WeatherSensitiveTask
{
    None,
    Spraying,
    Irrigation,
    Fertilization,
    Harvest
}

/// <summary>
/// Maps a task onto a weather-sensitive category. Task types are free text supplied
/// by templates and by growers, so classification is keyword based and covers Greek
/// as well as English wording.
/// </summary>
public static class TaskWeatherClassifier
{
    private static readonly (WeatherSensitiveTask Category, string[] Keywords)[] Rules =
    [
        (WeatherSensitiveTask.Spraying, ["spray", "pesticid", "herbicid", "fungicid", "ψεκασ", "φυτοπροστασ"]),
        (WeatherSensitiveTask.Irrigation, ["irrig", "water", "αρδευ", "ποτισ"]),
        (WeatherSensitiveTask.Fertilization, ["fertil", "manure", "compost", "λιπανσ", "λιπασμ"]),
        (WeatherSensitiveTask.Harvest, ["harvest", "pick", "συγκομιδ", "ελαιοσυλλογ", "ραβδισ"])
    ];

    /// <summary>
    /// Returns the category for a task. Spraying is checked first because a title such
    /// as "spray fertiliser" is governed by drift rules rather than leaching rules.
    /// </summary>
    public static WeatherSensitiveTask Classify(string? type, string? title)
    {
        var haystack = $"{type} {title}".ToLowerInvariant();

        foreach (var (category, keywords) in Rules)
        {
            if (keywords.Any(keyword => haystack.Contains(keyword, StringComparison.Ordinal)))
            {
                return category;
            }
        }

        return WeatherSensitiveTask.None;
    }
}
