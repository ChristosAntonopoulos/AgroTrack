namespace OliveLifecycle.Core.Enums;

public enum ChecklistItemType
{
    Checkbox,
    Number,
    QuantityWithUnit,
    Choice,
    Text,
    Photo,
    Document,
    Confirmation
}

public static class ChecklistItemTypeExtensions
{
    public static string ToApiString(this ChecklistItemType type) => type switch
    {
        ChecklistItemType.Number => "number",
        ChecklistItemType.QuantityWithUnit => "quantity_with_unit",
        ChecklistItemType.Choice => "choice",
        ChecklistItemType.Text => "text",
        ChecklistItemType.Photo => "photo",
        ChecklistItemType.Document => "document",
        ChecklistItemType.Confirmation => "confirmation",
        _ => "checkbox"
    };

    public static ChecklistItemType FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "number" => ChecklistItemType.Number,
        "quantity_with_unit" => ChecklistItemType.QuantityWithUnit,
        "choice" => ChecklistItemType.Choice,
        "text" => ChecklistItemType.Text,
        "photo" => ChecklistItemType.Photo,
        "document" => ChecklistItemType.Document,
        "confirmation" => ChecklistItemType.Confirmation,
        _ => ChecklistItemType.Checkbox
    };
}
