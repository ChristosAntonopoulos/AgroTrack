namespace OliveLifecycle.Core.Enums;

public enum FinancialEntryStatus
{
    Posted,
    Voided
}

public static class FinancialEntryStatusExtensions
{
    public static string ToApiString(this FinancialEntryStatus status) => status switch
    {
        FinancialEntryStatus.Voided => "voided",
        _ => "posted"
    };

    public static FinancialEntryStatus FromApiString(string? value) => value?.ToLowerInvariant() switch
    {
        "voided" => FinancialEntryStatus.Voided,
        _ => FinancialEntryStatus.Posted
    };
}
