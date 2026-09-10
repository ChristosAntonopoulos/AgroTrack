namespace OliveLifecycle.Core.Enums;

public enum FinancialQuantityUnit
{
    Litre,
    Kilogram,
    Tonne,
    Hour,
    Workday,
    Piece,
    Hectare,
    Tree,
    Container,
    Other
}

public static class FinancialQuantityUnitExtensions
{
    public static string ToApiString(this FinancialQuantityUnit unit) => unit switch
    {
        FinancialQuantityUnit.Litre => "litre",
        FinancialQuantityUnit.Kilogram => "kilogram",
        FinancialQuantityUnit.Tonne => "tonne",
        FinancialQuantityUnit.Hour => "hour",
        FinancialQuantityUnit.Workday => "workday",
        FinancialQuantityUnit.Piece => "piece",
        FinancialQuantityUnit.Hectare => "hectare",
        FinancialQuantityUnit.Tree => "tree",
        FinancialQuantityUnit.Container => "container",
        _ => "other"
    };

    public static FinancialQuantityUnit? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "litre" or "liter" or "l" => FinancialQuantityUnit.Litre,
        "kilogram" or "kg" => FinancialQuantityUnit.Kilogram,
        "tonne" or "t" => FinancialQuantityUnit.Tonne,
        "hour" or "hours" => FinancialQuantityUnit.Hour,
        "workday" or "workdays" => FinancialQuantityUnit.Workday,
        "piece" or "pieces" => FinancialQuantityUnit.Piece,
        "hectare" or "ha" => FinancialQuantityUnit.Hectare,
        "tree" or "trees" => FinancialQuantityUnit.Tree,
        "container" or "containers" => FinancialQuantityUnit.Container,
        "other" => FinancialQuantityUnit.Other,
        _ => null
    };
}
