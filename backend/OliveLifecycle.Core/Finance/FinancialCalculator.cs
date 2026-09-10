using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Core.Finance;

/// <summary>
/// Single source of financial totals. Official amounts come only from Posted transactions.
/// </summary>
public static class FinancialCalculator
{
    public const int MinResultYear = 2000;

    public static decimal RoundMoney(decimal value) =>
        decimal.Round(value, 2, MidpointRounding.AwayFromZero);

    public static int MaxResultYear(DateTime utcNow) => AthensTime.CalendarYear(utcNow) + 1;

    public static bool IsResultYearInRange(int year, DateTime utcNow) =>
        year >= MinResultYear && year <= MaxResultYear(utcNow);

    public static IReadOnlyList<FinancialTransaction> Posted(IEnumerable<FinancialTransaction> transactions) =>
        transactions.Where(t => t.Status == FinancialTransactionStatus.Posted).ToList();

    public static decimal SumPosted(
        IEnumerable<FinancialTransaction> transactions,
        FinancialTransactionType type)
    {
        return RoundMoney(Posted(transactions)
            .Where(t => t.Type == type)
            .Sum(t => t.Amount));
    }

    public static decimal? PerHectare(decimal? amount, double? areaHectares)
    {
        if (amount is null || areaHectares is null or <= 0)
        {
            return null;
        }

        return RoundMoney(amount.Value / (decimal)areaHectares.Value);
    }

    public static decimal? CostPerKilogramOfOil(decimal? postedExpenses, decimal? oilKilograms)
    {
        if (postedExpenses is null || oilKilograms is null or <= 0)
        {
            return null;
        }

        return RoundMoney(postedExpenses.Value / oilKilograms.Value);
    }

    public static YearFinancialSummary BuildYearSummary(
        int year,
        IReadOnlyCollection<FinancialTransaction> transactions,
        IReadOnlyCollection<FinancialFieldMetrics> fields,
        string? filterFieldId = null,
        decimal? oilKilograms = null,
        HarvestOilProduction oilProduction = default,
        string language = "el")
    {
        var fieldById = fields.ToDictionary(f => f.FieldId, StringComparer.Ordinal);
        var scoped = transactions
            .Where(t => t.ResultYear == year)
            .Where(t => MatchesFieldScope(t, filterFieldId, fieldById.Keys))
            .ToList();

        var posted = Posted(scoped);
        var drafts = scoped.Where(t => t.Status == FinancialTransactionStatus.Draft).ToList();
        var hasPosted = posted.Count > 0;

        decimal? income = hasPosted ? SumPosted(posted, FinancialTransactionType.Income) : null;
        decimal? expenses = hasPosted ? SumPosted(posted, FinancialTransactionType.Expense) : null;
        decimal? net = hasPosted && income.HasValue && expenses.HasValue
            ? RoundMoney(income.Value - expenses.Value)
            : null;

        var includedArea = ResolveIncludedAreaHectares(filterFieldId, fieldById, posted);
        var includesUnassigned = filterFieldId is null && posted.Any(t => string.IsNullOrEmpty(t.FieldId));
        var oliveOil = BuildOliveOilEconomics(posted, expenses, oilProduction, language);

        return new YearFinancialSummary
        {
            Year = year,
            Currency = posted.Select(t => t.Currency).FirstOrDefault() ?? "EUR",
            FieldId = filterFieldId,
            TotalIncome = income,
            TotalExpenses = expenses,
            NetResult = net,
            ResultLabel = FinancialDisplayLabels.ResultLabel(net, hasPosted, language),
            TransactionCount = posted.Count,
            DraftCount = drafts.Count,
            LastPostedAt = posted
                .Select(t => t.PostedAt ?? t.UpdatedAt)
                .DefaultIfEmpty()
                .Max()
                is var last && last != default
                ? last
                : null,
            MonthlyResults = BuildMonthlyResults(posted, language),
            FieldResults = filterFieldId is null
                ? BuildFieldResults(posted, fieldById, language)
                : [],
            IncomeByCategory = BuildCategoryResults(posted, FinancialTransactionType.Income),
            ExpenseByCategory = BuildCategoryResults(posted, FinancialTransactionType.Expense),
            CostPerHectare = PerHectare(expenses, includedArea),
            IncomePerHectare = PerHectare(income, includedArea),
            NetPerHectare = PerHectare(net, includedArea),
            CostPerKilogramOfOil = CostPerKilogramOfOil(expenses, oilKilograms),
            OliveOil = oliveOil,
            DataAvailability = new FinancialDataAvailability
            {
                HasPostedRecords = hasPosted,
                HasDraftRecords = drafts.Count > 0,
                IncomeIsUnknown = !hasPosted,
                ExpensesAreUnknown = !hasPosted,
                AreaIsMissing = includedArea is null or <= 0,
                OilQuantityIsMissing = oilKilograms is null or <= 0,
                IncludesUnassigned = includesUnassigned
            }
        };
    }

    public static OliveOilEconomics BuildOliveOilEconomics(
        IEnumerable<FinancialTransaction> postedTransactions,
        decimal? postedExpenses,
        HarvestOilProduction production,
        string language = "el")
    {
        var posted = Posted(postedTransactions);
        var oilSales = posted
            .Where(t => t.Type == FinancialTransactionType.Income
                        && t.Category == FinancialTransactionCategory.OliveOilSale)
            .ToList();
        var salesWithLitres = oilSales.Where(FinancialQuantityCalculator.IsLitreOilSale).ToList();
        var missingLitres = oilSales.Count - salesWithLitres.Count;

        decimal? soldLitres = salesWithLitres.Count > 0
            ? FinancialQuantityCalculator.RoundQuantity(salesWithLitres.Sum(t => t.Quantity!.Value))
            : null;

        decimal? averagePrice = null;
        string? averageMessage = null;
        if (salesWithLitres.Count > 0 && soldLitres is > 0)
        {
            var saleIncome = salesWithLitres.Sum(t => t.Amount);
            averagePrice = FinancialQuantityCalculator.RoundUnitPrice(saleIncome / soldLitres.Value);
        }
        else if (oilSales.Count > 0)
        {
            averageMessage = FinancialDisplayLabels.AddLitresToOilSales(language);
        }

        var confirmed = production.ConfirmedLitres is > 0
            ? FinancialQuantityCalculator.RoundQuantity(production.ConfirmedLitres.Value)
            : (decimal?)null;
        var estimated = confirmed is null && production.EstimatedLitres is > 0
            ? FinancialQuantityCalculator.RoundQuantity(production.EstimatedLitres.Value)
            : (decimal?)null;
        var produced = confirmed ?? estimated;
        var producedIsEstimate = confirmed is null && estimated is not null;

        decimal? remaining = null;
        var remainingConfirmed = false;
        string? remainingMessage = null;
        if (produced is > 0 && soldLitres is not null)
        {
            var raw = FinancialQuantityCalculator.RoundQuantity(produced.Value - soldLitres.Value);
            if (raw < 0)
            {
                remainingMessage = FinancialDisplayLabels.RemainingLitresUnconfirmed(language);
            }
            else
            {
                remaining = raw;
                remainingConfirmed = !producedIsEstimate;
            }
        }

        decimal? costPerLitre = null;
        string? costMessage = null;
        if (confirmed is > 0 && postedExpenses is not null)
        {
            costPerLitre = RoundMoney(postedExpenses.Value / confirmed.Value);
        }
        else if (oilSales.Count > 0 || produced is not null)
        {
            costMessage = FinancialDisplayLabels.InsufficientProductionForCostPerLitre(language);
        }

        decimal? resultPerLitre = averagePrice is not null && costPerLitre is not null
            ? FinancialQuantityCalculator.RoundUnitPrice(averagePrice.Value - costPerLitre.Value)
            : null;

        return new OliveOilEconomics
        {
            ProducedLitres = produced,
            ProducedLitresAreEstimated = producedIsEstimate,
            SoldLitres = soldLitres,
            RemainingLitres = remaining,
            RemainingIsConfirmed = remainingConfirmed,
            AverageSalePricePerLitre = averagePrice,
            ProductionCostPerLitre = costPerLitre,
            ResultPerLitre = resultPerLitre,
            PostedOliveOilSaleCount = oilSales.Count,
            PostedOliveOilSalesMissingLitres = missingLitres,
            HasProductionOrSales = produced is not null || oilSales.Count > 0,
            ProductionCostMessage = costPerLitre is null ? costMessage : null,
            AveragePriceMessage = averageMessage,
            RemainingMessage = remainingMessage
        };
    }

    public static HarvestFinancialSummary BuildHarvestSummary(
        string harvestId,
        string fieldId,
        IEnumerable<FinancialTransaction> transactions)
    {
        var linked = transactions
            .Where(t => t.RelatedHarvestId == harvestId && t.Status == FinancialTransactionStatus.Posted)
            .ToList();
        var incomeTx = linked.Where(t => t.Type == FinancialTransactionType.Income).ToList();
        var expenseTx = linked.Where(t => t.Type == FinancialTransactionType.Expense).ToList();
        var hasIncome = incomeTx.Count > 0;
        var hasExpenses = expenseTx.Count > 0;
        decimal? income = hasIncome ? SumPosted(incomeTx, FinancialTransactionType.Income) : null;
        decimal? expenses = hasExpenses ? SumPosted(expenseTx, FinancialTransactionType.Expense) : null;

        return new HarvestFinancialSummary
        {
            HarvestId = harvestId,
            FieldId = fieldId,
            Income = income,
            Expenses = expenses,
            NetResult = hasIncome ? RoundMoney((income ?? 0) - (expenses ?? 0)) : null,
            HasRecordedIncome = hasIncome,
            HasRecordedExpenses = hasExpenses,
            TransactionCount = linked.Count,
            DataAvailability = new FinancialDataAvailability
            {
                HasPostedRecords = linked.Count > 0,
                IncomeIsUnknown = !hasIncome,
                ExpensesAreUnknown = !hasExpenses
            }
        };
    }

    public static TaskFinancialSummary BuildTaskSummary(
        string taskId,
        string fieldId,
        decimal? estimatedCost,
        IEnumerable<FinancialTransaction> transactions)
    {
        var linked = transactions
            .Where(t => t.RelatedTaskId == taskId && t.Status == FinancialTransactionStatus.Posted)
            .ToList();
        var expenses = linked.Where(t => t.Type == FinancialTransactionType.Expense).ToList();
        var hasActual = expenses.Count > 0;
        decimal? actual = hasActual ? SumPosted(expenses, FinancialTransactionType.Expense) : null;

        return new TaskFinancialSummary
        {
            TaskId = taskId,
            FieldId = fieldId,
            EstimatedCost = estimatedCost,
            ActualCost = actual,
            Difference = estimatedCost.HasValue && actual.HasValue
                ? RoundMoney(actual.Value - estimatedCost.Value)
                : null,
            TransactionCount = expenses.Count,
            DataAvailability = new FinancialDataAvailability
            {
                HasPostedRecords = hasActual,
                ExpensesAreUnknown = !hasActual
            }
        };
    }

    private static bool MatchesFieldScope(
        FinancialTransaction transaction,
        string? filterFieldId,
        IReadOnlyCollection<string> permittedFieldIds)
    {
        if (!string.IsNullOrEmpty(filterFieldId))
        {
            return transaction.FieldId == filterFieldId;
        }

        if (string.IsNullOrEmpty(transaction.FieldId))
        {
            return true;
        }

        return permittedFieldIds.Contains(transaction.FieldId);
    }

    private static double? ResolveIncludedAreaHectares(
        string? filterFieldId,
        IReadOnlyDictionary<string, FinancialFieldMetrics> fieldById,
        IReadOnlyCollection<FinancialTransaction> posted)
    {
        if (!string.IsNullOrEmpty(filterFieldId))
        {
            return fieldById.TryGetValue(filterFieldId, out var field) ? field.AreaHectares : null;
        }

        var includedIds = posted
            .Select(t => t.FieldId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        if (includedIds.Count == 0)
        {
            return null;
        }

        double total = 0;
        foreach (var id in includedIds)
        {
            if (!fieldById.TryGetValue(id!, out var field) || field.AreaHectares is null or <= 0)
            {
                return null;
            }

            total += field.AreaHectares.Value;
        }

        return total;
    }

    private static IReadOnlyList<MonthlyFinancialResult> BuildMonthlyResults(
        IReadOnlyCollection<FinancialTransaction> posted,
        string language)
    {
        _ = language;
        return Enumerable.Range(1, 12).Select(month =>
        {
            var monthPosted = posted.Where(t => AthensTime.ToAthens(t.OccurredOn).Month == month).ToList();
            var hasRecords = monthPosted.Count > 0;
            decimal? income = hasRecords ? SumPosted(monthPosted, FinancialTransactionType.Income) : null;
            decimal? expenses = hasRecords ? SumPosted(monthPosted, FinancialTransactionType.Expense) : null;
            return new MonthlyFinancialResult
            {
                Month = month,
                Income = income,
                Expenses = expenses,
                NetResult = hasRecords ? RoundMoney((income ?? 0) - (expenses ?? 0)) : null,
                HasRecords = hasRecords
            };
        }).ToList();
    }

    private static IReadOnlyList<FieldFinancialResult> BuildFieldResults(
        IReadOnlyCollection<FinancialTransaction> posted,
        IReadOnlyDictionary<string, FinancialFieldMetrics> fieldById,
        string language)
    {
        var rows = new List<FieldFinancialResult>();
        foreach (var field in fieldById.Values.OrderBy(f => f.Name, StringComparer.CurrentCultureIgnoreCase))
        {
            var fieldPosted = posted.Where(t => t.FieldId == field.FieldId).ToList();
            var hasRecords = fieldPosted.Count > 0;
            decimal? income = hasRecords ? SumPosted(fieldPosted, FinancialTransactionType.Income) : null;
            decimal? expenses = hasRecords ? SumPosted(fieldPosted, FinancialTransactionType.Expense) : null;
            decimal? net = hasRecords ? RoundMoney((income ?? 0) - (expenses ?? 0)) : null;
            rows.Add(new FieldFinancialResult
            {
                FieldId = field.FieldId,
                FieldName = field.Name,
                Income = income,
                Expenses = expenses,
                NetResult = net,
                CostPerHectare = PerHectare(expenses, field.AreaHectares),
                IncomePerHectare = PerHectare(income, field.AreaHectares),
                NetPerHectare = PerHectare(net, field.AreaHectares),
                TransactionCount = fieldPosted.Count
            });
        }

        var unassigned = posted.Where(t => string.IsNullOrEmpty(t.FieldId)).ToList();
        if (unassigned.Count > 0)
        {
            var income = SumPosted(unassigned, FinancialTransactionType.Income);
            var expenses = SumPosted(unassigned, FinancialTransactionType.Expense);
            rows.Add(new FieldFinancialResult
            {
                FieldId = null,
                FieldName = FinancialDisplayLabels.UnassignedField(language),
                IsUnassigned = true,
                Income = income,
                Expenses = expenses,
                NetResult = RoundMoney(income - expenses),
                TransactionCount = unassigned.Count
            });
        }

        return rows;
    }

    private static IReadOnlyList<CategoryFinancialResult> BuildCategoryResults(
        IReadOnlyCollection<FinancialTransaction> posted,
        FinancialTransactionType type)
    {
        var typed = posted.Where(t => t.Type == type && t.Category.HasValue).ToList();
        var total = typed.Sum(t => t.Amount);
        return typed
            .GroupBy(t => t.Category!.Value)
            .Select(g =>
            {
                var amount = RoundMoney(g.Sum(t => t.Amount));
                return new CategoryFinancialResult
                {
                    Category = g.Key,
                    CategoryKey = g.Key.ToApiString(),
                    Amount = amount,
                    PercentageOfTotal = total > 0 ? RoundMoney(amount / total * 100m) : null
                };
            })
            .OrderByDescending(r => r.Amount)
            .ToList();
    }
}
