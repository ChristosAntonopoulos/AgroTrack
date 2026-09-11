namespace OliveLifecycle.Core.Enums;

public enum ChronologioCategory
{
    Task,
    Expense,
    Income,
    Harvest,
    Note,
    Photo,
    Weather,
    Intelligence,
    Activity,
    Collaborator,
    Lifecycle
}

public static class ChronologioCategoryExtensions
{
    public static string ToApiString(this ChronologioCategory category) => category switch
    {
        ChronologioCategory.Task => "task",
        ChronologioCategory.Expense => "expense",
        ChronologioCategory.Income => "income",
        ChronologioCategory.Harvest => "harvest",
        ChronologioCategory.Note => "note",
        ChronologioCategory.Photo => "photo",
        ChronologioCategory.Weather => "weather",
        ChronologioCategory.Intelligence => "intelligence",
        ChronologioCategory.Activity => "activity",
        ChronologioCategory.Collaborator => "collaborator",
        ChronologioCategory.Lifecycle => "lifecycle",
        _ => "activity"
    };

    public static ChronologioCategory? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "task" => ChronologioCategory.Task,
        "expense" => ChronologioCategory.Expense,
        "income" => ChronologioCategory.Income,
        "harvest" => ChronologioCategory.Harvest,
        "note" => ChronologioCategory.Note,
        "photo" => ChronologioCategory.Photo,
        "weather" => ChronologioCategory.Weather,
        "intelligence" => ChronologioCategory.Intelligence,
        "activity" => ChronologioCategory.Activity,
        "collaborator" => ChronologioCategory.Collaborator,
        "lifecycle" => ChronologioCategory.Lifecycle,
        "work" => ChronologioCategory.Task,
        "observation" or "observations" => ChronologioCategory.Note,
        "money" => ChronologioCategory.Expense,
        "field_change" or "field-change" => ChronologioCategory.Lifecycle,
        "weather_warning" => ChronologioCategory.Weather,
        _ => null
    };
}
