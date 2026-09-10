namespace OliveLifecycle.Core.Enums;

public enum FinancialProductKind
{
    OliveOil,
    Olives,
    Fuel,
    Fertilizer,
    PlantProtection,
    Labour,
    Irrigation,
    Equipment,
    Mill,
    Transport,
    CollaboratorService,
    Other
}

public static class FinancialProductKindExtensions
{
    public static string ToApiString(this FinancialProductKind kind) => kind switch
    {
        FinancialProductKind.OliveOil => "olive_oil",
        FinancialProductKind.Olives => "olives",
        FinancialProductKind.Fuel => "fuel",
        FinancialProductKind.Fertilizer => "fertilizer",
        FinancialProductKind.PlantProtection => "plant_protection",
        FinancialProductKind.Labour => "labour",
        FinancialProductKind.Irrigation => "irrigation",
        FinancialProductKind.Equipment => "equipment",
        FinancialProductKind.Mill => "mill",
        FinancialProductKind.Transport => "transport",
        FinancialProductKind.CollaboratorService => "collaborator_service",
        _ => "other"
    };

    public static FinancialProductKind? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "olive_oil" => FinancialProductKind.OliveOil,
        "olives" => FinancialProductKind.Olives,
        "fuel" => FinancialProductKind.Fuel,
        "fertilizer" => FinancialProductKind.Fertilizer,
        "plant_protection" => FinancialProductKind.PlantProtection,
        "labour" or "labor" => FinancialProductKind.Labour,
        "irrigation" => FinancialProductKind.Irrigation,
        "equipment" => FinancialProductKind.Equipment,
        "mill" => FinancialProductKind.Mill,
        "transport" => FinancialProductKind.Transport,
        "collaborator_service" => FinancialProductKind.CollaboratorService,
        "other" => FinancialProductKind.Other,
        _ => null
    };

    public static FinancialProductKind? FromCategory(FinancialTransactionCategory? category) => category switch
    {
        FinancialTransactionCategory.OliveOilSale => FinancialProductKind.OliveOil,
        FinancialTransactionCategory.OliveSale => FinancialProductKind.Olives,
        FinancialTransactionCategory.FuelAndEnergy => FinancialProductKind.Fuel,
        FinancialTransactionCategory.Fertilizers => FinancialProductKind.Fertilizer,
        FinancialTransactionCategory.PlantProtection => FinancialProductKind.PlantProtection,
        FinancialTransactionCategory.Labor => FinancialProductKind.Labour,
        FinancialTransactionCategory.Irrigation => FinancialProductKind.Irrigation,
        FinancialTransactionCategory.EquipmentAndTools => FinancialProductKind.Equipment,
        FinancialTransactionCategory.Mill => FinancialProductKind.Mill,
        FinancialTransactionCategory.Transport => FinancialProductKind.Transport,
        FinancialTransactionCategory.CollaboratorServices => FinancialProductKind.CollaboratorService,
        null => null,
        _ => FinancialProductKind.Other
    };
}
