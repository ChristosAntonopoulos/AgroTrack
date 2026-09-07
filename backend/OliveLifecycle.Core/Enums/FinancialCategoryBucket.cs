namespace OliveLifecycle.Core.Enums;

public enum FinancialCategoryBucket
{
    Labor,
    Inputs,
    Harvest,
    Other
}

public static class FinancialCategoryBucketExtensions
{
    public static string ToApiString(this FinancialCategoryBucket bucket) => bucket switch
    {
        FinancialCategoryBucket.Labor => "labor",
        FinancialCategoryBucket.Inputs => "inputs",
        FinancialCategoryBucket.Harvest => "harvest",
        _ => "other"
    };

    public static FinancialCategoryBucket? FromApiString(string? value) => value?.ToLowerInvariant() switch
    {
        "labor" => FinancialCategoryBucket.Labor,
        "inputs" => FinancialCategoryBucket.Inputs,
        "harvest" => FinancialCategoryBucket.Harvest,
        "other" => FinancialCategoryBucket.Other,
        _ => null
    };
}
