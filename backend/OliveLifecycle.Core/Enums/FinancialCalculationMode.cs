namespace OliveLifecycle.Core.Enums;

public enum FinancialCalculationMode
{
    TotalOnly,
    QuantityTimesUnitPrice,
    QuantityAndTotal
}

public static class FinancialCalculationModeExtensions
{
    public static string ToApiString(this FinancialCalculationMode mode) => mode switch
    {
        FinancialCalculationMode.QuantityTimesUnitPrice => "quantity_times_unit_price",
        FinancialCalculationMode.QuantityAndTotal => "quantity_and_total",
        _ => "total_only"
    };

    public static FinancialCalculationMode? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "quantity_times_unit_price" => FinancialCalculationMode.QuantityTimesUnitPrice,
        "quantity_and_total" => FinancialCalculationMode.QuantityAndTotal,
        "total_only" or "" or null => FinancialCalculationMode.TotalOnly,
        _ => null
    };
}
