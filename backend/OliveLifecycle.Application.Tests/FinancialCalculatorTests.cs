using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Finance;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FinancialCalculatorTests
{
    private static readonly DateTime PostedAt = new(2026, 6, 1, 10, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void PostedOnly_AffectsTotals_DraftAndVoidDoNot()
    {
        var transactions = new[]
        {
            Tx("posted-income", FinancialTransactionType.Income, FinancialTransactionStatus.Posted, 1000, fieldId: "field-1"),
            Tx("posted-expense", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 400, fieldId: "field-1"),
            Tx("draft", FinancialTransactionType.Expense, FinancialTransactionStatus.Draft, 999, fieldId: "field-1"),
            Tx("void", FinancialTransactionType.Income, FinancialTransactionStatus.Void, 5000, fieldId: "field-1")
        };

        var summary = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1"));

        Assert.Equal(1000m, summary.TotalIncome);
        Assert.Equal(400m, summary.TotalExpenses);
        Assert.Equal(600m, summary.NetResult);
        Assert.Equal(2, summary.TransactionCount);
        Assert.Equal(1, summary.DraftCount);
        Assert.Equal(FinancialDisplayLabels.ProfitEl, summary.ResultLabel);
    }

    [Fact]
    public void EmptyYear_LeavesTotalsUnknown()
    {
        var summary = FinancialCalculator.BuildYearSummary(2026, [], Fields("field-1"));

        Assert.Null(summary.TotalIncome);
        Assert.Null(summary.TotalExpenses);
        Assert.Null(summary.NetResult);
        Assert.Equal(0, summary.TransactionCount);
        Assert.Equal(FinancialDisplayLabels.NoEntriesEl, summary.ResultLabel);
        Assert.False(summary.DataAvailability.HasPostedRecords);
        Assert.All(summary.MonthlyResults, month => Assert.False(month.HasRecords));
        Assert.All(summary.MonthlyResults, month => Assert.Null(month.Income));
    }

    [Fact]
    public void FieldFilter_ExcludesOtherFieldsAndUnassigned()
    {
        var transactions = new[]
        {
            Tx("a", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 100, fieldId: "field-1"),
            Tx("b", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 50, fieldId: "field-2"),
            Tx("c", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 25, fieldId: null)
        };

        var field1 = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1", "field-2"), filterFieldId: "field-1");
        var farm = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1", "field-2"));

        Assert.Equal(100m, field1.TotalExpenses);
        Assert.Equal(1, field1.TransactionCount);
        Assert.Equal(175m, farm.TotalExpenses);
        Assert.Equal(3, farm.TransactionCount);
        Assert.True(farm.DataAvailability.IncludesUnassigned);
        Assert.Contains(farm.FieldResults, r => r.IsUnassigned && r.Expenses == 25m);
        Assert.DoesNotContain(field1.FieldResults, r => r.IsUnassigned);
    }

    [Fact]
    public void ResultYear_ControlsWhichTransactionsCount()
    {
        var transactions = new[]
        {
            Tx("y26", FinancialTransactionType.Income, FinancialTransactionStatus.Posted, 300, fieldId: "field-1", resultYear: 2026),
            Tx("y25", FinancialTransactionType.Income, FinancialTransactionStatus.Posted, 900, fieldId: "field-1", resultYear: 2025)
        };

        var summary = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1"));

        Assert.Equal(300m, summary.TotalIncome);
        Assert.Equal(1, summary.TransactionCount);
    }

    [Fact]
    public void TaskLinkedExpense_IsCountedOnceInYearTotal()
    {
        var transactions = new[]
        {
            Tx("task-cost", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 180, fieldId: "field-1", relatedTaskId: "task-1")
        };

        var year = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1"));
        var task = FinancialCalculator.BuildTaskSummary("task-1", "field-1", estimatedCost: 200, transactions);

        Assert.Equal(180m, year.TotalExpenses);
        Assert.Equal(0m, year.TotalIncome);
        Assert.Equal(180m, task.ActualCost);
        Assert.Equal(-20m, task.Difference);
        Assert.Equal(1, year.TransactionCount);
        Assert.Equal(1, task.TransactionCount);
        Assert.Equal(200m, task.EstimatedCost);
        Assert.Equal(-180m, year.NetResult);
    }

    [Fact]
    public void HarvestLinkedTransactions_AreNotDoubleCounted()
    {
        var transactions = new[]
        {
            Tx("sale", FinancialTransactionType.Income, FinancialTransactionStatus.Posted, 3450, fieldId: "field-1", relatedHarvestId: "harvest-1", category: FinancialTransactionCategory.OliveOilSale),
            Tx("mill", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 180, fieldId: "field-1", relatedHarvestId: "harvest-1", category: FinancialTransactionCategory.Mill)
        };

        var year = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1"));
        var harvest = FinancialCalculator.BuildHarvestSummary("harvest-1", "field-1", transactions);

        Assert.Equal(3450m, year.TotalIncome);
        Assert.Equal(180m, year.TotalExpenses);
        Assert.Equal(3270m, year.NetResult);
        Assert.Equal(3450m, harvest.Income);
        Assert.Equal(180m, harvest.Expenses);
        Assert.Equal(3270m, harvest.NetResult);
        Assert.Equal(2, year.TransactionCount);
        Assert.True(harvest.HasRecordedIncome);
    }

    [Fact]
    public void TaskAndHarvestLinkedExpense_IsCountedOnceInYearTotal()
    {
        var transactions = new[]
        {
            Tx(
                "shared",
                FinancialTransactionType.Expense,
                FinancialTransactionStatus.Posted,
                180,
                fieldId: "field-1",
                relatedTaskId: "task-1",
                relatedHarvestId: "harvest-1")
        };

        var year = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1"));
        var task = FinancialCalculator.BuildTaskSummary("task-1", "field-1", estimatedCost: 200, transactions);
        var harvest = FinancialCalculator.BuildHarvestSummary("harvest-1", "field-1", transactions);

        Assert.Equal(180m, year.TotalExpenses);
        Assert.Equal(1, year.TransactionCount);
        Assert.Equal(180m, task.ActualCost);
        Assert.Equal(180m, harvest.Expenses);
        Assert.Equal(200m, task.EstimatedCost);
        Assert.NotEqual(task.EstimatedCost, year.TotalExpenses);
    }

    [Fact]
    public void HarvestWithoutIncome_DoesNotTreatSaleAsZero()
    {
        var transactions = new[]
        {
            Tx("mill", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 80, fieldId: "field-1", relatedHarvestId: "harvest-1")
        };

        var harvest = FinancialCalculator.BuildHarvestSummary("harvest-1", "field-1", transactions);

        Assert.Null(harvest.Income);
        Assert.Equal(80m, harvest.Expenses);
        Assert.Null(harvest.NetResult);
        Assert.False(harvest.HasRecordedIncome);
        Assert.True(harvest.DataAvailability.IncomeIsUnknown);
    }

    [Fact]
    public void PerHectare_RejectsZeroAndMissingArea()
    {
        var transactions = new[]
        {
            Tx("exp", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 100, fieldId: "field-1")
        };

        var zeroArea = FinancialCalculator.BuildYearSummary(
            2026,
            transactions,
            [new FinancialFieldMetrics("field-1", "Κτήμα", 0)],
            filterFieldId: "field-1");
        var missing = FinancialCalculator.BuildYearSummary(
            2026,
            transactions,
            [new FinancialFieldMetrics("field-1", "Κτήμα", null)],
            filterFieldId: "field-1");
        var valid = FinancialCalculator.BuildYearSummary(
            2026,
            transactions,
            [new FinancialFieldMetrics("field-1", "Κτήμα", 2)],
            filterFieldId: "field-1");

        Assert.Null(FinancialCalculator.PerHectare(100, 0));
        Assert.Null(FinancialCalculator.PerHectare(100, null));
        Assert.Null(zeroArea.CostPerHectare);
        Assert.Null(missing.CostPerHectare);
        Assert.Equal(50m, valid.CostPerHectare);
        Assert.True(zeroArea.DataAvailability.AreaIsMissing);
    }

    [Fact]
    public void CostPerKilogram_RejectsMissingAndZeroProduction()
    {
        Assert.Null(FinancialCalculator.CostPerKilogramOfOil(100, null));
        Assert.Null(FinancialCalculator.CostPerKilogramOfOil(100, 0));
        Assert.Equal(2m, FinancialCalculator.CostPerKilogramOfOil(100, 50));

        var summary = FinancialCalculator.BuildYearSummary(
            2026,
            [Tx("exp", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 100, fieldId: "field-1")],
            Fields("field-1"),
            oilKilograms: null);

        Assert.Null(summary.CostPerKilogramOfOil);
        Assert.True(summary.DataAvailability.OilQuantityIsMissing);
    }

    [Fact]
    public void DraftFieldIsCallerResponsibility_CalculatorOnlyUsesProvidedFields()
    {
        var transactions = new[]
        {
            Tx("active", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 40, fieldId: "active"),
            Tx("draft", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 999, fieldId: "draft")
        };

        var summary = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("active"));

        Assert.Equal(40m, summary.TotalExpenses);
        Assert.DoesNotContain(summary.FieldResults, r => r.FieldId == "draft");
    }

    [Fact]
    public void CategoryBreakdown_UsesPostedAmountsAndPercentages()
    {
        var transactions = new[]
        {
            Tx("a", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 75, fieldId: "field-1", category: FinancialTransactionCategory.Fertilizers),
            Tx("b", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 25, fieldId: "field-1", category: FinancialTransactionCategory.Labor)
        };

        var summary = FinancialCalculator.BuildYearSummary(2026, transactions, Fields("field-1"));

        Assert.Equal(75m, summary.ExpenseByCategory[0].Amount);
        Assert.Equal(75m, summary.ExpenseByCategory[0].PercentageOfTotal);
        Assert.Equal("fertilizers", summary.ExpenseByCategory[0].CategoryKey);
        Assert.Equal("Λιπάσματα", FinancialDisplayLabels.Category(summary.ExpenseByCategory[0].Category));
    }

    [Fact]
    public void OliveOilEconomics_UsesPostedLitreSalesOnly()
    {
        var transactions = new[]
        {
            OilSale("posted-litres", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Litre),
            OilSale("draft-litres", FinancialTransactionStatus.Draft, 1000m, 100m, FinancialQuantityUnit.Litre),
            OilSale("void-litres", FinancialTransactionStatus.Void, 2000m, 200m, FinancialQuantityUnit.Litre),
            OilSale("posted-no-litres", FinancialTransactionStatus.Posted, 400m, null, null),
            Tx("expense", FinancialTransactionType.Expense, FinancialTransactionStatus.Posted, 395m, "field-1",
                category: FinancialTransactionCategory.Fertilizers)
        };

        var summary = FinancialCalculator.BuildYearSummary(
            2026,
            transactions,
            Fields("field-1"),
            oilKilograms: 1134m,
            oilProduction: new HarvestOilProduction(1240m, null));

        Assert.Equal(5670m, summary.TotalIncome);
        Assert.Equal(395m, summary.TotalExpenses);
        Assert.Equal(850m, summary.OliveOil.SoldLitres);
        Assert.Equal(1240m, summary.OliveOil.ProducedLitres);
        Assert.Equal(390m, summary.OliveOil.RemainingLitres);
        Assert.True(summary.OliveOil.RemainingIsConfirmed);
        Assert.Equal(6.2000m, summary.OliveOil.AverageSalePricePerLitre);
        Assert.Equal(0.32m, summary.OliveOil.ProductionCostPerLitre);
        Assert.Equal(5.8800m, summary.OliveOil.ResultPerLitre);
        Assert.Equal(1, summary.OliveOil.PostedOliveOilSalesMissingLitres);
        Assert.Null(summary.OliveOil.AveragePriceMessage);
    }

    [Fact]
    public void OliveOilEconomics_ExcludesDraftAndVoidFromAveragePrice()
    {
        var oil = FinancialCalculator.BuildOliveOilEconomics(
            [
                OilSale("posted", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Litre),
                OilSale("draft", FinancialTransactionStatus.Draft, 620m, 100m, FinancialQuantityUnit.Litre),
                OilSale("void", FinancialTransactionStatus.Void, 1240m, 200m, FinancialQuantityUnit.Litre)
            ],
            postedExpenses: 3050m,
            production: new HarvestOilProduction(1240m, null));

        Assert.Equal(850m, oil.SoldLitres);
        Assert.Equal(6.2000m, oil.AverageSalePricePerLitre);
        Assert.Equal(1, oil.PostedOliveOilSaleCount);
    }

    [Fact]
    public void OliveOilEconomics_DoesNotConvertKilogramsToLitres()
    {
        var oil = FinancialCalculator.BuildOliveOilEconomics(
            [
                OilSale("kg-sale", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Kilogram)
            ],
            postedExpenses: 100m,
            production: default);

        Assert.Null(oil.SoldLitres);
        Assert.Null(oil.AverageSalePricePerLitre);
        Assert.Equal(FinancialDisplayLabels.AddLitresToOilSalesEl, oil.AveragePriceMessage);
        Assert.Null(oil.ProducedLitres);
    }

    [Fact]
    public void OliveOilEconomics_MissingProduction_ExplainsCostPerLitre()
    {
        var oil = FinancialCalculator.BuildOliveOilEconomics(
            [OilSale("sale", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Litre)],
            postedExpenses: 3050m,
            production: default);

        Assert.Null(oil.ProductionCostPerLitre);
        Assert.Null(oil.ResultPerLitre);
        Assert.Equal(FinancialDisplayLabels.InsufficientProductionCostPerLitreEl, oil.ProductionCostMessage);
        Assert.Null(oil.RemainingLitres);
    }

    [Fact]
    public void OliveOilEconomics_DoesNotConfirmNegativeRemaining()
    {
        var oil = FinancialCalculator.BuildOliveOilEconomics(
            [OilSale("sale", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Litre)],
            postedExpenses: 100m,
            production: new HarvestOilProduction(400m, null));

        Assert.Null(oil.RemainingLitres);
        Assert.False(oil.RemainingIsConfirmed);
        Assert.Equal(FinancialDisplayLabels.RemainingLitresUnconfirmedEl, oil.RemainingMessage);
    }

    [Fact]
    public void OliveOilEconomics_EstimatedConversion_DoesNotUnlockConfirmedCost()
    {
        var oil = FinancialCalculator.BuildOliveOilEconomics(
            [OilSale("sale", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Litre)],
            postedExpenses: 3050m,
            production: new HarvestOilProduction(null, 1240m));

        Assert.Equal(1240m, oil.ProducedLitres);
        Assert.True(oil.ProducedLitresAreEstimated);
        Assert.Null(oil.ProductionCostPerLitre);
        Assert.Equal(390m, oil.RemainingLitres);
        Assert.False(oil.RemainingIsConfirmed);
    }

    [Fact]
    public void HarvestLinkedOilSale_CountsOnceInYearAndSoldLitres()
    {
        var transactions = new[]
        {
            OilSale("sale", FinancialTransactionStatus.Posted, 5270m, 850m, FinancialQuantityUnit.Litre,
                relatedHarvestId: "harvest-1")
        };

        var year = FinancialCalculator.BuildYearSummary(
            2026,
            transactions,
            Fields("field-1"),
            oilProduction: new HarvestOilProduction(1240m, null));
        var harvest = FinancialCalculator.BuildHarvestSummary("harvest-1", "field-1", transactions);

        Assert.Equal(5270m, year.TotalIncome);
        Assert.Equal(5270m, harvest.Income);
        Assert.Equal(850m, year.OliveOil.SoldLitres);
        Assert.Equal(1, year.TransactionCount);
    }

    [Fact]
    public void DisplayLabels_NeverExposeRawInternalValues()
    {
        foreach (FinancialTransactionCategory category in Enum.GetValues<FinancialTransactionCategory>())
        {
            var label = FinancialDisplayLabels.Category(category);
            Assert.DoesNotContain('_', label);
            Assert.False(string.Equals(label, category.ToApiString(), StringComparison.OrdinalIgnoreCase));
        }

        Assert.Equal("Έσοδο", FinancialDisplayLabels.Type(FinancialTransactionType.Income));
        Assert.Equal("Έξοδο", FinancialDisplayLabels.Type(FinancialTransactionType.Expense));
        Assert.Equal("Πρόχειρο", FinancialDisplayLabels.Status(FinancialTransactionStatus.Draft));
        Assert.Equal("Ακυρωμένο", FinancialDisplayLabels.Status(FinancialTransactionStatus.Void));
        Assert.Equal("Γενική εκμετάλλευση", FinancialDisplayLabels.UnassignedField());
        Assert.Equal("Το έτος στο οποίο θέλεις να υπολογιστεί αυτή η καταχώρηση.", FinancialDisplayLabels.ResultYearHelpEl);
    }

    private static IReadOnlyList<FinancialFieldMetrics> Fields(params string[] ids) =>
        ids.Select(id => new FinancialFieldMetrics(id, id, 1)).ToList();

    private static FinancialTransaction Tx(
        string id,
        FinancialTransactionType type,
        FinancialTransactionStatus status,
        decimal amount,
        string? fieldId,
        int resultYear = 2026,
        string? relatedTaskId = null,
        string? relatedHarvestId = null,
        FinancialTransactionCategory? category = null)
    {
        return new FinancialTransaction
        {
            Id = id,
            OwnerUserId = "owner-1",
            Type = type,
            Status = status,
            Amount = amount,
            Currency = "EUR",
            OccurredOn = PostedAt,
            ResultYear = resultYear,
            FieldId = fieldId,
            Category = category ?? (type == FinancialTransactionType.Income
                ? FinancialTransactionCategory.OliveOilSale
                : FinancialTransactionCategory.Labor),
            Description = id,
            RelatedTaskId = relatedTaskId,
            RelatedHarvestId = relatedHarvestId,
            PostedAt = status == FinancialTransactionStatus.Posted ? PostedAt : null,
            UpdatedAt = PostedAt
        };
    }

    private static FinancialTransaction OilSale(
        string id,
        FinancialTransactionStatus status,
        decimal amount,
        decimal? quantity,
        FinancialQuantityUnit? unit,
        string? relatedHarvestId = null)
    {
        var tx = Tx(
            id,
            FinancialTransactionType.Income,
            status,
            amount,
            fieldId: "field-1",
            relatedHarvestId: relatedHarvestId,
            category: FinancialTransactionCategory.OliveOilSale);
        tx.Quantity = quantity;
        tx.QuantityUnit = unit;
        tx.UnitPrice = quantity is > 0 ? decimal.Round(amount / quantity.Value, 4, MidpointRounding.AwayFromZero) : null;
        tx.CalculationMode = quantity is > 0
            ? FinancialCalculationMode.QuantityTimesUnitPrice
            : FinancialCalculationMode.TotalOnly;
        tx.ProductKind = FinancialProductKind.OliveOil;
        tx.Description = "Πώληση ελαιολάδου";
        return tx;
    }
}
