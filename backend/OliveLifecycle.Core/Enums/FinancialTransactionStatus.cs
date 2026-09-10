namespace OliveLifecycle.Core.Enums;

public enum FinancialTransactionStatus
{
    Draft,
    Posted,
    Void
}

public static class FinancialTransactionStatusExtensions
{
    public static string ToApiString(this FinancialTransactionStatus status) => status switch
    {
        FinancialTransactionStatus.Draft => "draft",
        FinancialTransactionStatus.Void => "void",
        _ => "posted"
    };

    public static FinancialTransactionStatus? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "draft" => FinancialTransactionStatus.Draft,
        "void" => FinancialTransactionStatus.Void,
        "voided" => FinancialTransactionStatus.Void,
        "posted" => FinancialTransactionStatus.Posted,
        _ => null
    };
}
