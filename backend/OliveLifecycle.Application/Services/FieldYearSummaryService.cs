using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Finance;
using OliveLifecycle.Core.Units;

namespace OliveLifecycle.Application.Services;

/// <summary>
/// Field + ResultYear rollup: posted money (identical to Money year totals for that field),
/// TaskExecutions, confirmed harvests, phenology, weather reviews, and official warnings.
/// Estimated FieldTask cost never enters totals.
/// </summary>
public class FieldYearSummaryService : IFieldYearSummaryService
{
    private readonly IFieldRepository _fields;
    private readonly IFinancialTransactionRepository _transactions;
    private readonly IHarvestRecordRepository _harvests;
    private readonly ITaskExecutionRepository _executions;
    private readonly IFieldPhenologyObservationRepository _phenology;
    private readonly IFieldWeatherPeriodReviewRepository _weatherReviews;
    private readonly IOfficialAgriculturalWarningRepository _warnings;
    private readonly IFinancialAuthorizationService _authorization;

    public FieldYearSummaryService(
        IFieldRepository fields,
        IFinancialTransactionRepository transactions,
        IHarvestRecordRepository harvests,
        ITaskExecutionRepository executions,
        IFieldPhenologyObservationRepository phenology,
        IFieldWeatherPeriodReviewRepository weatherReviews,
        IOfficialAgriculturalWarningRepository warnings,
        IFinancialAuthorizationService authorization)
    {
        _fields = fields;
        _transactions = transactions;
        _harvests = harvests;
        _executions = executions;
        _phenology = phenology;
        _weatherReviews = weatherReviews;
        _warnings = warnings;
        _authorization = authorization;
    }

    public async Task<FieldYearSummaryDto> GetAsync(
        string fieldId,
        int resultYear,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
        if (field.Status == FieldStatus.Draft)
        {
            throw new ValidationException("Draft fields are not included in year results.");
        }

        var access = await _authorization.ResolveForFieldAsync(fieldId, userId, userRole, cancellationToken);
        if (!access.Can(FinancialCapabilities.ViewSummary) && !access.IsOwner)
        {
            throw new ForbiddenException("You do not have access to the yearly field result.");
        }

        var transactions = await _transactions.GetForYearAsync(
            field.OwnerId,
            resultYear,
            [fieldId],
            fieldId,
            includeUnassigned: false,
            cancellationToken);

        var metrics = new[] { new FinancialFieldMetrics(field.Id, field.Name, field.ResolveAreaHectares()) };
        var harvests = (await _harvests.GetByFieldIdsAsync([fieldId], cancellationToken))
            .Where(h => h.Status == FinancialEntryStatus.Posted)
            .Where(h => FinancialSummaryService.ResolveHarvestResultYear(h) == resultYear)
            .ToList();

        decimal? oilKg = harvests
            .Where(h => h.OilKg is > 0)
            .Select(h => (decimal)h.OilKg!.Value)
            .DefaultIfEmpty()
            .Sum();
        if (oilKg == 0) oilKg = null;

        decimal? oliveKg = harvests.Sum(h => (decimal)h.OliveKg);
        if (oliveKg == 0) oliveKg = null;

        var oilProduction = FinancialSummaryService.ResolveOilProduction(harvests);
        var money = FinancialCalculator.BuildYearSummary(
            resultYear,
            transactions,
            metrics,
            fieldId,
            oilKg,
            oilProduction,
            language);

        var executions = (await _executions.GetByFieldAndYearAsync(fieldId, resultYear, cancellationToken))
            .Where(e => e.IsActive)
            .ToList();

        var phenology = await _phenology.GetByFieldIdAsync(fieldId, cancellationToken);
        var phenologyInYear = phenology
            .Where(p => p.ObservedOn.Year == resultYear || AthensYear(p.ObservedOn) == resultYear)
            .ToList();

        var reviews = await _weatherReviews.GetByFieldIdsAsync(
            [fieldId],
            from: new DateTime(resultYear, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            to: new DateTime(resultYear, 12, 31, 23, 59, 59, DateTimeKind.Utc),
            cancellationToken);

        var warnings = await _warnings.GetActiveForFieldAsync(fieldId, cancellationToken);

        var summary = new FieldYearSummary
        {
            FieldId = field.Id,
            FieldName = field.Name,
            ResultYear = resultYear,
            Currency = money.Currency,
            TotalIncome = money.TotalIncome,
            TotalExpenses = money.TotalExpenses,
            NetResult = money.NetResult,
            ResultLabel = money.ResultLabel,
            CostPerKilogramOfOil = money.CostPerKilogramOfOil,
            OilKilograms = oilKg,
            OliveKilograms = oliveKg,
            OliveOil = money.OliveOil,
            PostedTransactionCount = money.TransactionCount,
            DraftTransactionCount = money.DraftCount,
            CompletedExecutionCount = executions.Count(e => e.Outcome == TaskExecutionOutcome.Completed),
            PartialExecutionCount = executions.Count(e => e.Outcome == TaskExecutionOutcome.PartiallyCompleted),
            ConfirmedHarvestCount = harvests.Count,
            PhenologyObservationCount = phenologyInYear.Count,
            WeatherReviewCount = reviews.Count,
            ActiveOfficialWarningCount = warnings.Count,
            DataAvailability = money.DataAvailability
        };

        var dto = FinancialTransactionMapper.ToDto(money, language);
        return new FieldYearSummaryDto
        {
            FieldId = summary.FieldId,
            FieldName = summary.FieldName,
            ResultYear = summary.ResultYear,
            Currency = summary.Currency,
            TotalIncome = summary.TotalIncome,
            TotalExpenses = summary.TotalExpenses,
            NetResult = summary.NetResult,
            ResultLabel = summary.ResultLabel,
            CostPerKilogramOfOil = summary.CostPerKilogramOfOil,
            CostPerKilogramMessage = dto.CostPerKilogramMessage,
            OilKilograms = summary.OilKilograms,
            OliveKilograms = summary.OliveKilograms,
            OliveOil = dto.OliveOil,
            PostedTransactionCount = summary.PostedTransactionCount,
            DraftTransactionCount = summary.DraftTransactionCount,
            CompletedExecutionCount = summary.CompletedExecutionCount,
            PartialExecutionCount = summary.PartialExecutionCount,
            ConfirmedHarvestCount = summary.ConfirmedHarvestCount,
            PhenologyObservationCount = summary.PhenologyObservationCount,
            WeatherReviewCount = summary.WeatherReviewCount,
            ActiveOfficialWarningCount = summary.ActiveOfficialWarningCount,
            DataAvailability = dto.DataAvailability
        };
    }

    private static int AthensYear(DateTime utc) =>
        Core.Time.AthensTime.CalendarYear(utc);
}
