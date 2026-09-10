namespace OliveLifecycle.Core.Enums;

public enum FinancialTransactionSourceType
{
    Manual,
    Task,
    Harvest,
    Service
}

public static class FinancialTransactionSourceTypeExtensions
{
    public static string ToApiString(this FinancialTransactionSourceType source) => source switch
    {
        FinancialTransactionSourceType.Task => "task",
        FinancialTransactionSourceType.Harvest => "harvest",
        FinancialTransactionSourceType.Service => "service",
        _ => "manual"
    };

    public static FinancialTransactionSourceType? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "task" => FinancialTransactionSourceType.Task,
        "harvest" => FinancialTransactionSourceType.Harvest,
        "service" => FinancialTransactionSourceType.Service,
        "manual" => FinancialTransactionSourceType.Manual,
        _ => null
    };
}
