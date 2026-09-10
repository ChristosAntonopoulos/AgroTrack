using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core;

/// <summary>
/// Centralized human-readable labels. The UI must never show raw enum or API values.
/// </summary>
public static class FinancialDisplayLabels
{
    public const string UnassignedFieldEl = "Γενική εκμετάλλευση";
    public const string UnassignedFieldEn = "General farm";
    public const string ResultYearHelpEl = "Το έτος στο οποίο θέλεις να υπολογιστεί αυτή η καταχώρηση.";
    public const string ResultYearHelpEn = "The year this entry should count toward.";
    public const string NoIncomeRecordedEl = "Δεν έχει καταχωρηθεί ακόμη έσοδο";
    public const string NoIncomeRecordedEn = "No income has been recorded yet";
    public const string NoEntriesEl = "Δεν υπάρχουν ακόμη καταχωρήσεις";
    public const string NoEntriesEn = "There are no entries yet";
    public const string ProfitEl = "Κέρδος";
    public const string LossEl = "Ζημιά";
    public const string BalancedEl = "Ισοσκελισμένο";
    public const string InsufficientOilCostEl = "Δεν υπάρχουν αρκετά δεδομένα για κόστος ανά κιλό.";
    public const string InsufficientOilCostEn = "There is not enough data for cost per kilogram.";
    public const string InsufficientProductionCostPerLitreEl =
        "Δεν υπάρχουν αρκετά δεδομένα παραγωγής για υπολογισμό κόστους ανά λίτρο.";
    public const string InsufficientProductionCostPerLitreEn =
        "There is not enough production data to calculate cost per litre.";
    public const string AddLitresToOilSalesEl =
        "Προσθέστε τα λίτρα στις πωλήσεις για να υπολογιστεί η μέση τιμή.";
    public const string AddLitresToOilSalesEn =
        "Add litres to the sales to calculate the average price.";
    public const string RemainingLitresUnconfirmedEl =
        "Τα πωλημένα λίτρα υπερβαίνουν την καταγεγραμμένη παραγωγή. Το υπόλοιπο δεν εμφανίζεται ως βέβαιο.";
    public const string RemainingLitresUnconfirmedEn =
        "Sold litres exceed recorded production. Remaining litres are not shown as confirmed.";
    public const string NoMonthEntriesEl = "Καμία καταχώρηση";
    public const string NoMonthEntriesEn = "No entries";

    public static string Category(FinancialTransactionCategory category, string language = "el") =>
        IsEnglish(language) ? CategoryEn(category) : CategoryEl(category);

    public static string Type(FinancialTransactionType type, string language = "el") =>
        IsEnglish(language)
            ? type == FinancialTransactionType.Income ? "Income" : "Expense"
            : type == FinancialTransactionType.Income ? "Έσοδο" : "Έξοδο";

    public static string TypeHelp(FinancialTransactionType type, string language = "el") =>
        IsEnglish(language)
            ? type == FinancialTransactionType.Income ? "Money you received" : "Money you paid"
            : type == FinancialTransactionType.Income ? "Χρήματα που πήρες" : "Χρήματα που πλήρωσες";

    public static string Status(FinancialTransactionStatus status, string language = "el") => status switch
    {
        FinancialTransactionStatus.Draft => IsEnglish(language) ? "Draft" : "Πρόχειρο",
        FinancialTransactionStatus.Void => IsEnglish(language) ? "Voided" : "Ακυρωμένο",
        _ => IsEnglish(language) ? "Posted" : "Καταχωρημένο"
    };

    public static string Source(FinancialTransactionSourceType source, string language = "el") => source switch
    {
        FinancialTransactionSourceType.Task => IsEnglish(language) ? "Task" : "Εργασία",
        FinancialTransactionSourceType.Harvest => IsEnglish(language) ? "Harvest" : "Συγκομιδή",
        FinancialTransactionSourceType.Service => IsEnglish(language) ? "Service" : "Υπηρεσία",
        _ => IsEnglish(language) ? "Manual entry" : "Χειροκίνητη καταχώρηση"
    };

    public static string UnassignedField(string language = "el") =>
        IsEnglish(language) ? UnassignedFieldEn : UnassignedFieldEl;

    public static string InsufficientProductionForCostPerLitre(string language = "el") =>
        IsEnglish(language) ? InsufficientProductionCostPerLitreEn : InsufficientProductionCostPerLitreEl;

    public static string AddLitresToOilSales(string language = "el") =>
        IsEnglish(language) ? AddLitresToOilSalesEn : AddLitresToOilSalesEl;

    public static string RemainingLitresUnconfirmed(string language = "el") =>
        IsEnglish(language) ? RemainingLitresUnconfirmedEn : RemainingLitresUnconfirmedEl;

    public static string QuantityUnit(FinancialQuantityUnit unit, string language = "el") =>
        IsEnglish(language) ? QuantityUnitEn(unit) : QuantityUnitEl(unit);

    public static string QuantityUnitAbbreviation(FinancialQuantityUnit unit) => unit switch
    {
        FinancialQuantityUnit.Litre => "L",
        FinancialQuantityUnit.Kilogram => "kg",
        FinancialQuantityUnit.Tonne => "t",
        FinancialQuantityUnit.Hour => "ώρες",
        FinancialQuantityUnit.Workday => "ημέρες",
        FinancialQuantityUnit.Piece => "τεμ.",
        FinancialQuantityUnit.Hectare => "ha",
        FinancialQuantityUnit.Tree => "δέντρα",
        FinancialQuantityUnit.Container => "δοχεία",
        _ => ""
    };

    public static string ResultLabel(decimal? net, bool hasPostedRecords, string language = "el")
    {
        if (!hasPostedRecords)
        {
            return IsEnglish(language) ? NoEntriesEn : NoEntriesEl;
        }

        if (net is null)
        {
            return IsEnglish(language) ? NoEntriesEn : NoEntriesEl;
        }

        if (net > 0)
        {
            return IsEnglish(language) ? "Profit" : ProfitEl;
        }

        if (net < 0)
        {
            return IsEnglish(language) ? "Loss" : LossEl;
        }

        return IsEnglish(language) ? "Balanced" : BalancedEl;
    }

    private static bool IsEnglish(string language) =>
        language.StartsWith("en", StringComparison.OrdinalIgnoreCase);

    private static string CategoryEl(FinancialTransactionCategory category) => category switch
    {
        FinancialTransactionCategory.Labor => "Εργασία",
        FinancialTransactionCategory.Fertilizers => "Λιπάσματα",
        FinancialTransactionCategory.PlantProtection => "Φυτοπροστασία",
        FinancialTransactionCategory.FuelAndEnergy => "Καύσιμα και ενέργεια",
        FinancialTransactionCategory.Irrigation => "Άρδευση",
        FinancialTransactionCategory.EquipmentAndTools => "Εξοπλισμός και εργαλεία",
        FinancialTransactionCategory.Transport => "Μεταφορές",
        FinancialTransactionCategory.Mill => "Ελαιοτριβείο",
        FinancialTransactionCategory.CollaboratorServices => "Υπηρεσίες συνεργατών",
        FinancialTransactionCategory.LandRent => "Ενοίκιο γης",
        FinancialTransactionCategory.OtherExpense => "Άλλο έξοδο",
        FinancialTransactionCategory.OliveOilSale => "Πώληση ελαιολάδου",
        FinancialTransactionCategory.OliveSale => "Πώληση ελιάς",
        FinancialTransactionCategory.Subsidy => "Επιδότηση",
        FinancialTransactionCategory.Compensation => "Αποζημίωση",
        FinancialTransactionCategory.ServiceProvision => "Παροχή υπηρεσίας",
        FinancialTransactionCategory.OtherIncome => "Άλλο έσοδο",
        _ => "Άλλο έξοδο"
    };

    private static string CategoryEn(FinancialTransactionCategory category) => category switch
    {
        FinancialTransactionCategory.Labor => "Labor",
        FinancialTransactionCategory.Fertilizers => "Fertilizers",
        FinancialTransactionCategory.PlantProtection => "Plant protection",
        FinancialTransactionCategory.FuelAndEnergy => "Fuel and energy",
        FinancialTransactionCategory.Irrigation => "Irrigation",
        FinancialTransactionCategory.EquipmentAndTools => "Equipment and tools",
        FinancialTransactionCategory.Transport => "Transport",
        FinancialTransactionCategory.Mill => "Olive mill",
        FinancialTransactionCategory.CollaboratorServices => "Collaborator services",
        FinancialTransactionCategory.LandRent => "Land rent",
        FinancialTransactionCategory.OtherExpense => "Other expense",
        FinancialTransactionCategory.OliveOilSale => "Olive oil sale",
        FinancialTransactionCategory.OliveSale => "Olive sale",
        FinancialTransactionCategory.Subsidy => "Subsidy",
        FinancialTransactionCategory.Compensation => "Compensation",
        FinancialTransactionCategory.ServiceProvision => "Service provided",
        FinancialTransactionCategory.OtherIncome => "Other income",
        _ => "Other expense"
    };

    private static string QuantityUnitEl(FinancialQuantityUnit unit) => unit switch
    {
        FinancialQuantityUnit.Litre => "λίτρα",
        FinancialQuantityUnit.Kilogram => "κιλά",
        FinancialQuantityUnit.Tonne => "τόνοι",
        FinancialQuantityUnit.Hour => "ώρες",
        FinancialQuantityUnit.Workday => "μεροκάματα",
        FinancialQuantityUnit.Piece => "τεμάχια",
        FinancialQuantityUnit.Hectare => "εκτάρια",
        FinancialQuantityUnit.Tree => "δέντρα",
        FinancialQuantityUnit.Container => "δοχεία",
        _ => "άλλο"
    };

    private static string QuantityUnitEn(FinancialQuantityUnit unit) => unit switch
    {
        FinancialQuantityUnit.Litre => "litres",
        FinancialQuantityUnit.Kilogram => "kilograms",
        FinancialQuantityUnit.Tonne => "tonnes",
        FinancialQuantityUnit.Hour => "hours",
        FinancialQuantityUnit.Workday => "workdays",
        FinancialQuantityUnit.Piece => "pieces",
        FinancialQuantityUnit.Hectare => "hectares",
        FinancialQuantityUnit.Tree => "trees",
        FinancialQuantityUnit.Container => "containers",
        _ => "other"
    };
}
