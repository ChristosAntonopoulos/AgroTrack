namespace OliveLifecycle.Core.Enums;

public enum FinancialCategory
{
    Labor,
    Fertilizers,
    Treatments,
    IrrigationWater,
    ElectricityFuel,
    Equipment,
    Repairs,
    Pruning,
    HarvestWorkers,
    MillCost,
    Transport,
    Packaging,
    Storage,
    Agronomist,
    Other
}

public static class FinancialCategoryExtensions
{
    public static string ToApiString(this FinancialCategory category) => category switch
    {
        FinancialCategory.Labor => "labor",
        FinancialCategory.Fertilizers => "fertilizers",
        FinancialCategory.Treatments => "treatments",
        FinancialCategory.IrrigationWater => "irrigation_water",
        FinancialCategory.ElectricityFuel => "electricity_fuel",
        FinancialCategory.Equipment => "equipment",
        FinancialCategory.Repairs => "repairs",
        FinancialCategory.Pruning => "pruning",
        FinancialCategory.HarvestWorkers => "harvest_workers",
        FinancialCategory.MillCost => "mill_cost",
        FinancialCategory.Transport => "transport",
        FinancialCategory.Packaging => "packaging",
        FinancialCategory.Storage => "storage",
        FinancialCategory.Agronomist => "agronomist",
        _ => "other"
    };

    public static FinancialCategory? FromApiString(string? value) => value?.ToLowerInvariant() switch
    {
        "labor" => FinancialCategory.Labor,
        "fertilizers" => FinancialCategory.Fertilizers,
        "treatments" => FinancialCategory.Treatments,
        "irrigation_water" => FinancialCategory.IrrigationWater,
        "electricity_fuel" => FinancialCategory.ElectricityFuel,
        "equipment" => FinancialCategory.Equipment,
        "repairs" => FinancialCategory.Repairs,
        "pruning" => FinancialCategory.Pruning,
        "harvest_workers" => FinancialCategory.HarvestWorkers,
        "mill_cost" => FinancialCategory.MillCost,
        "transport" => FinancialCategory.Transport,
        "packaging" => FinancialCategory.Packaging,
        "storage" => FinancialCategory.Storage,
        "agronomist" => FinancialCategory.Agronomist,
        "other" => FinancialCategory.Other,
        _ => null
    };

    public static FinancialCategoryBucket ToBucket(this FinancialCategory category) => category switch
    {
        FinancialCategory.Labor or FinancialCategory.Pruning => FinancialCategoryBucket.Labor,
        FinancialCategory.Fertilizers or FinancialCategory.Treatments
            or FinancialCategory.IrrigationWater or FinancialCategory.ElectricityFuel
            or FinancialCategory.Equipment or FinancialCategory.Repairs => FinancialCategoryBucket.Inputs,
        FinancialCategory.HarvestWorkers or FinancialCategory.MillCost
            or FinancialCategory.Transport or FinancialCategory.Packaging
            or FinancialCategory.Storage => FinancialCategoryBucket.Harvest,
        _ => FinancialCategoryBucket.Other
    };
}
