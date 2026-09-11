namespace OliveLifecycle.Core.Enums;

/// <summary>
/// Product-facing Chronologio categories. Source enums stay on the wire;
/// this is what Greek UI must show.
/// </summary>
public enum ChronologioPrimaryCategory
{
    Work,
    Observation,
    Money,
    Harvest,
    Weather,
    FieldChange
}

public static class ChronologioPrimaryCategoryExtensions
{
    public static string ToApiString(this ChronologioPrimaryCategory category) => category switch
    {
        ChronologioPrimaryCategory.Work => "work",
        ChronologioPrimaryCategory.Observation => "observation",
        ChronologioPrimaryCategory.Money => "money",
        ChronologioPrimaryCategory.Harvest => "harvest",
        ChronologioPrimaryCategory.Weather => "weather",
        ChronologioPrimaryCategory.FieldChange => "field_change",
        _ => "work"
    };

    public static ChronologioPrimaryCategory FromSource(ChronologioCategory source) => source switch
    {
        ChronologioCategory.Task => ChronologioPrimaryCategory.Work,
        ChronologioCategory.Note or ChronologioCategory.Photo => ChronologioPrimaryCategory.Observation,
        ChronologioCategory.Expense or ChronologioCategory.Income => ChronologioPrimaryCategory.Money,
        ChronologioCategory.Harvest => ChronologioPrimaryCategory.Harvest,
        ChronologioCategory.Weather or ChronologioCategory.Intelligence => ChronologioPrimaryCategory.Weather,
        ChronologioCategory.Lifecycle or ChronologioCategory.Collaborator or ChronologioCategory.Activity
            => ChronologioPrimaryCategory.FieldChange,
        _ => ChronologioPrimaryCategory.Work
    };

    public static ChronologioPrimaryCategory? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "work" or "task" or "εργασίες" or "εργασία" => ChronologioPrimaryCategory.Work,
        "observation" or "observations" or "note" or "photo"
            or "παρατηρήσεις" or "παρατήρηση" => ChronologioPrimaryCategory.Observation,
        "money" or "expense" or "income" or "χρήματα" => ChronologioPrimaryCategory.Money,
        "harvest" or "συγκομιδή" => ChronologioPrimaryCategory.Harvest,
        "weather" or "weather_warning" or "intelligence"
            or "καιρός" or "καιρος" => ChronologioPrimaryCategory.Weather,
        "field_change" or "field-change" or "lifecycle" or "collaborator" or "activity"
            or "αλλαγές χωραφιού" or "αλλαγες χωραφιου" => ChronologioPrimaryCategory.FieldChange,
        _ => null
    };
}
