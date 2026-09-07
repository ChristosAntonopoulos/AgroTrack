namespace OliveLifecycle.Core.Enums;

public enum FinancialEntryKind
{
    Expense,
    Income
}

public static class FinancialEntryKindExtensions
{
    public static string ToApiString(this FinancialEntryKind kind) => kind switch
    {
        FinancialEntryKind.Income => "income",
        _ => "expense"
    };

    public static FinancialEntryKind FromApiString(string? value) => value?.ToLowerInvariant() switch
    {
        "income" => FinancialEntryKind.Income,
        _ => FinancialEntryKind.Expense
    };
}
