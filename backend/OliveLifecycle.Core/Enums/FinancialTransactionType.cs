namespace OliveLifecycle.Core.Enums;

public enum FinancialTransactionType
{
    Expense,
    Income
}

public static class FinancialTransactionTypeExtensions
{
    public static string ToApiString(this FinancialTransactionType type) => type switch
    {
        FinancialTransactionType.Income => "income",
        _ => "expense"
    };

    public static FinancialTransactionType? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "income" => FinancialTransactionType.Income,
        "expense" => FinancialTransactionType.Expense,
        _ => null
    };
}
