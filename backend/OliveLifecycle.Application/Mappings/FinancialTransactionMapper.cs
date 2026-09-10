using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Finance;

namespace OliveLifecycle.Application.Mappings;

public static class FinancialTransactionMapper
{
    public static FinancialTransactionDto ToDto(FinancialTransaction transaction, string language = "el")
    {
        var category = transaction.Category;
        return new FinancialTransactionDto
        {
            Id = transaction.Id,
            OwnerUserId = transaction.OwnerUserId,
            Type = transaction.Type.ToApiString(),
            TypeLabel = FinancialDisplayLabels.Type(transaction.Type, language),
            Status = transaction.Status.ToApiString(),
            StatusLabel = FinancialDisplayLabels.Status(transaction.Status, language),
            Amount = transaction.Amount,
            Currency = transaction.Currency,
            OccurredOn = transaction.OccurredOn,
            ResultYear = transaction.ResultYear,
            FieldId = transaction.FieldId,
            Category = category?.ToApiString(),
            CategoryLabel = category.HasValue ? FinancialDisplayLabels.Category(category.Value, language) : null,
            ProductKind = transaction.ProductKind?.ToApiString(),
            Quantity = transaction.Quantity,
            QuantityUnit = transaction.QuantityUnit?.ToApiString(),
            QuantityUnitLabel = transaction.QuantityUnit.HasValue
                ? FinancialDisplayLabels.QuantityUnit(transaction.QuantityUnit.Value, language)
                : null,
            QuantityUnitAbbreviation = transaction.QuantityUnit.HasValue
                ? FinancialDisplayLabels.QuantityUnitAbbreviation(transaction.QuantityUnit.Value)
                : null,
            UnitPrice = transaction.UnitPrice,
            CalculationMode = transaction.CalculationMode.ToApiString(),
            AmountIsCalculated = transaction.CalculationMode == FinancialCalculationMode.QuantityTimesUnitPrice,
            UnitPriceIsCalculated = transaction.CalculationMode == FinancialCalculationMode.QuantityAndTotal,
            Description = transaction.Description,
            PaymentMethod = transaction.PaymentMethod,
            CounterpartyName = transaction.CounterpartyName,
            RelatedTaskId = transaction.RelatedTaskId,
            RelatedHarvestId = transaction.RelatedHarvestId,
            RelatedCollaboratorId = transaction.RelatedCollaboratorId,
            SourceType = transaction.SourceType.ToApiString(),
            SourceTypeLabel = FinancialDisplayLabels.Source(transaction.SourceType, language),
            SourceId = transaction.SourceId,
            AttachmentIds = transaction.AttachmentIds.ToList(),
            Notes = transaction.Notes,
            CreatedByUserId = transaction.CreatedByUserId,
            CreatedAt = transaction.CreatedAt,
            UpdatedAt = transaction.UpdatedAt,
            PostedAt = transaction.PostedAt,
            VoidedAt = transaction.VoidedAt,
            VoidReason = transaction.VoidReason,
            VoidedByUserId = transaction.VoidedByUserId
        };
    }

    public static YearFinancialSummaryDto ToDto(YearFinancialSummary summary, string language = "el") => new()
    {
        Year = summary.Year,
        Currency = summary.Currency,
        FieldId = summary.FieldId,
        TotalIncome = summary.TotalIncome,
        TotalExpenses = summary.TotalExpenses,
        NetResult = summary.NetResult,
        ResultLabel = summary.ResultLabel,
        TransactionCount = summary.TransactionCount,
        DraftCount = summary.DraftCount,
        LastPostedAt = summary.LastPostedAt,
        MonthlyResults = summary.MonthlyResults.Select(m => new MonthlyFinancialResultDto
        {
            Month = m.Month,
            Income = m.Income,
            Expenses = m.Expenses,
            NetResult = m.NetResult,
            HasRecords = m.HasRecords,
            EmptyLabel = m.HasRecords
                ? string.Empty
                : (language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                    ? FinancialDisplayLabels.NoMonthEntriesEn
                    : FinancialDisplayLabels.NoMonthEntriesEl)
        }).ToList(),
        FieldResults = summary.FieldResults.Select(f => new FieldFinancialResultDto
        {
            FieldId = f.FieldId,
            FieldName = f.FieldName,
            IsUnassigned = f.IsUnassigned,
            Income = f.Income,
            Expenses = f.Expenses,
            NetResult = f.NetResult,
            CostPerHectare = f.CostPerHectare,
            IncomePerHectare = f.IncomePerHectare,
            NetPerHectare = f.NetPerHectare,
            TransactionCount = f.TransactionCount
        }).ToList(),
        IncomeByCategory = summary.IncomeByCategory.Select(c => ToCategoryDto(c, language)).ToList(),
        ExpenseByCategory = summary.ExpenseByCategory.Select(c => ToCategoryDto(c, language)).ToList(),
        CostPerHectare = summary.CostPerHectare,
        IncomePerHectare = summary.IncomePerHectare,
        NetPerHectare = summary.NetPerHectare,
        CostPerKilogramOfOil = summary.CostPerKilogramOfOil,
        CostPerKilogramMessage = summary.CostPerKilogramOfOil is null
            ? (language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? FinancialDisplayLabels.InsufficientOilCostEn
                : FinancialDisplayLabels.InsufficientOilCostEl)
            : null,
        OliveOil = ToDto(summary.OliveOil),
        DataAvailability = ToDto(summary.DataAvailability)
    };

    public static HarvestFinancialSummaryDto ToDto(HarvestFinancialSummary summary, string language = "el") => new()
    {
        HarvestId = summary.HarvestId,
        FieldId = summary.FieldId,
        Income = summary.Income,
        Expenses = summary.Expenses,
        NetResult = summary.NetResult,
        HasRecordedIncome = summary.HasRecordedIncome,
        HasRecordedExpenses = summary.HasRecordedExpenses,
        IncomeMessage = summary.HasRecordedIncome
            ? null
            : (language.StartsWith("en", StringComparison.OrdinalIgnoreCase)
                ? FinancialDisplayLabels.NoIncomeRecordedEn
                : FinancialDisplayLabels.NoIncomeRecordedEl),
        TransactionCount = summary.TransactionCount,
        DataAvailability = ToDto(summary.DataAvailability)
    };

    public static TaskFinancialSummaryDto ToDto(TaskFinancialSummary summary) => new()
    {
        TaskId = summary.TaskId,
        FieldId = summary.FieldId,
        EstimatedCost = summary.EstimatedCost,
        ActualCost = summary.ActualCost,
        Difference = summary.Difference,
        TransactionCount = summary.TransactionCount,
        DataAvailability = ToDto(summary.DataAvailability)
    };

    private static CategoryFinancialResultDto ToCategoryDto(CategoryFinancialResult result, string language) => new()
    {
        Category = result.CategoryKey,
        CategoryLabel = FinancialDisplayLabels.Category(result.Category, language),
        Amount = result.Amount,
        PercentageOfTotal = result.PercentageOfTotal
    };

    private static OliveOilEconomicsDto ToDto(OliveOilEconomics economics) => new()
    {
        ProducedLitres = economics.ProducedLitres,
        ProducedLitresAreEstimated = economics.ProducedLitresAreEstimated,
        SoldLitres = economics.SoldLitres,
        RemainingLitres = economics.RemainingLitres,
        RemainingIsConfirmed = economics.RemainingIsConfirmed,
        AverageSalePricePerLitre = economics.AverageSalePricePerLitre,
        ProductionCostPerLitre = economics.ProductionCostPerLitre,
        ResultPerLitre = economics.ResultPerLitre,
        PostedOliveOilSaleCount = economics.PostedOliveOilSaleCount,
        PostedOliveOilSalesMissingLitres = economics.PostedOliveOilSalesMissingLitres,
        HasProductionOrSales = economics.HasProductionOrSales,
        ProductionCostMessage = economics.ProductionCostMessage,
        AveragePriceMessage = economics.AveragePriceMessage,
        RemainingMessage = economics.RemainingMessage
    };

    private static FinancialDataAvailabilityDto ToDto(FinancialDataAvailability availability) => new()
    {
        HasPostedRecords = availability.HasPostedRecords,
        HasDraftRecords = availability.HasDraftRecords,
        IncomeIsUnknown = availability.IncomeIsUnknown,
        ExpensesAreUnknown = availability.ExpensesAreUnknown,
        AreaIsMissing = availability.AreaIsMissing,
        OilQuantityIsMissing = availability.OilQuantityIsMissing,
        IncludesUnassigned = availability.IncludesUnassigned
    };
}
