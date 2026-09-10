namespace OliveLifecycle.Core.Enums;

public enum FinancialTransactionCategory
{
    Labor,
    Fertilizers,
    PlantProtection,
    FuelAndEnergy,
    Irrigation,
    EquipmentAndTools,
    Transport,
    Mill,
    CollaboratorServices,
    LandRent,
    OtherExpense,
    OliveOilSale,
    OliveSale,
    Subsidy,
    Compensation,
    ServiceProvision,
    OtherIncome
}

public static class FinancialTransactionCategoryExtensions
{
    public static string ToApiString(this FinancialTransactionCategory category) => category switch
    {
        FinancialTransactionCategory.Labor => "labor",
        FinancialTransactionCategory.Fertilizers => "fertilizers",
        FinancialTransactionCategory.PlantProtection => "plant_protection",
        FinancialTransactionCategory.FuelAndEnergy => "fuel_and_energy",
        FinancialTransactionCategory.Irrigation => "irrigation",
        FinancialTransactionCategory.EquipmentAndTools => "equipment_and_tools",
        FinancialTransactionCategory.Transport => "transport",
        FinancialTransactionCategory.Mill => "mill",
        FinancialTransactionCategory.CollaboratorServices => "collaborator_services",
        FinancialTransactionCategory.LandRent => "land_rent",
        FinancialTransactionCategory.OtherExpense => "other_expense",
        FinancialTransactionCategory.OliveOilSale => "olive_oil_sale",
        FinancialTransactionCategory.OliveSale => "olive_sale",
        FinancialTransactionCategory.Subsidy => "subsidy",
        FinancialTransactionCategory.Compensation => "compensation",
        FinancialTransactionCategory.ServiceProvision => "service_provision",
        FinancialTransactionCategory.OtherIncome => "other_income",
        _ => "other_expense"
    };

    public static FinancialTransactionCategory? FromApiString(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "labor" => FinancialTransactionCategory.Labor,
        "fertilizers" => FinancialTransactionCategory.Fertilizers,
        "plant_protection" => FinancialTransactionCategory.PlantProtection,
        "fuel_and_energy" => FinancialTransactionCategory.FuelAndEnergy,
        "irrigation" => FinancialTransactionCategory.Irrigation,
        "equipment_and_tools" => FinancialTransactionCategory.EquipmentAndTools,
        "transport" => FinancialTransactionCategory.Transport,
        "mill" => FinancialTransactionCategory.Mill,
        "collaborator_services" => FinancialTransactionCategory.CollaboratorServices,
        "land_rent" => FinancialTransactionCategory.LandRent,
        "other_expense" => FinancialTransactionCategory.OtherExpense,
        "olive_oil_sale" => FinancialTransactionCategory.OliveOilSale,
        "olive_sale" => FinancialTransactionCategory.OliveSale,
        "subsidy" => FinancialTransactionCategory.Subsidy,
        "compensation" => FinancialTransactionCategory.Compensation,
        "service_provision" => FinancialTransactionCategory.ServiceProvision,
        "other_income" => FinancialTransactionCategory.OtherIncome,
        _ => null
    };

    public static bool IsExpense(this FinancialTransactionCategory category) =>
        category is FinancialTransactionCategory.Labor
            or FinancialTransactionCategory.Fertilizers
            or FinancialTransactionCategory.PlantProtection
            or FinancialTransactionCategory.FuelAndEnergy
            or FinancialTransactionCategory.Irrigation
            or FinancialTransactionCategory.EquipmentAndTools
            or FinancialTransactionCategory.Transport
            or FinancialTransactionCategory.Mill
            or FinancialTransactionCategory.CollaboratorServices
            or FinancialTransactionCategory.LandRent
            or FinancialTransactionCategory.OtherExpense;

    public static bool IsIncome(this FinancialTransactionCategory category) =>
        category is FinancialTransactionCategory.OliveOilSale
            or FinancialTransactionCategory.OliveSale
            or FinancialTransactionCategory.Subsidy
            or FinancialTransactionCategory.Compensation
            or FinancialTransactionCategory.ServiceProvision
            or FinancialTransactionCategory.OtherIncome;

    public static bool BelongsTo(this FinancialTransactionCategory category, FinancialTransactionType type) =>
        type == FinancialTransactionType.Income ? category.IsIncome() : category.IsExpense();
}
