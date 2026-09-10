using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Finance;
using OliveLifecycle.Core.Time;
using OliveLifecycle.Core.Units;

namespace OliveLifecycle.Application.Services;

public class FinancialSummaryService : IFinancialSummaryService
{
    private readonly IFinancialTransactionRepository _transactions;
    private readonly IFieldRepository _fields;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly IHarvestRecordRepository _harvests;
    private readonly IFinancialAuthorizationService _authorization;

    public FinancialSummaryService(
        IFinancialTransactionRepository transactions,
        IFieldRepository fields,
        IFieldTaskRepository fieldTasks,
        IHarvestRecordRepository harvests,
        IFinancialAuthorizationService authorization)
    {
        _transactions = transactions;
        _fields = fields;
        _fieldTasks = fieldTasks;
        _harvests = harvests;
        _authorization = authorization;
    }

    public async Task<YearFinancialSummaryDto> GetYearSummaryAsync(
        int year,
        string? fieldId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var includedFields = await ResolveSummaryFieldsAsync(fieldId, userId, userRole, cancellationToken);
        var ownerUserId = includedFields.Count > 0
            ? includedFields[0].OwnerId
            : userId;
        var unassignedAccess = await _authorization.ResolveForUnassignedAsync(userId, userRole, cancellationToken);
        var includeUnassigned = fieldId is null && unassignedAccess.IsOwner;
        var fieldIds = includedFields.Select(f => f.Id).ToList();

        var transactions = await _transactions.GetForYearAsync(
            ownerUserId,
            year,
            fieldIds,
            fieldId,
            includeUnassigned,
            cancellationToken);

        var metrics = includedFields.Select(ToMetrics).ToList();
        var harvests = await LoadPostedHarvestsAsync(fieldIds, year, cancellationToken);
        var oilKg = SumOilKilograms(harvests);
        var oilProduction = ResolveOilProduction(harvests);
        var summary = FinancialCalculator.BuildYearSummary(
            year, transactions, metrics, fieldId, oilKg, oilProduction, language);
        return FinancialTransactionMapper.ToDto(summary, language);
    }

    public async Task<TaskFinancialSummaryDto> GetTaskSummaryAsync(
        string taskId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var fieldTask = await _fieldTasks.GetByIdAsync(taskId, cancellationToken)
            ?? throw new NotFoundException("Task not found.");
        var fieldId = fieldTask.FieldId;
        // Display-only; never enters year totals.
        decimal? estimatedForDisplay = fieldTask.EstimatedCost;

        var access = await _authorization.ResolveForFieldAsync(fieldId, userId, userRole, cancellationToken);
        if (access.IsProfessional && !access.IsOwner)
        {
            throw new ForbiddenException("You do not have access to financial data.");
        }

        if (!access.IsOwner && !access.OwnExpensesOnly && !access.Can(FinancialCapabilities.ViewTransactions))
        {
            throw new ForbiddenException("You do not have access to financial data.");
        }

        var linked = await _transactions.GetByRelatedTaskIdAsync(taskId, cancellationToken);
        if (access.OwnExpensesOnly)
        {
            linked = linked
                .Where(t => t.Type == FinancialTransactionType.Expense && t.CreatedByUserId == userId)
                .ToList();
        }

        // Actual cost = Posted expenses linked to this FieldTask id only.
        var summary = FinancialCalculator.BuildTaskSummary(taskId, fieldId, estimatedForDisplay, linked);
        return FinancialTransactionMapper.ToDto(summary);
    }

    public async Task<HarvestFinancialSummaryDto> GetHarvestSummaryAsync(
        string harvestId,
        string userId,
        string userRole,
        string language = "el",
        CancellationToken cancellationToken = default)
    {
        var harvest = await _harvests.GetByIdAsync(harvestId, cancellationToken)
            ?? throw new NotFoundException("Harvest not found.");
        var access = await _authorization.ResolveForFieldAsync(harvest.FieldId, userId, userRole, cancellationToken);
        if (!access.Can(FinancialCapabilities.ViewSummary) && !access.IsOwner)
        {
            throw new ForbiddenException("You do not have access to harvest financial results.");
        }

        var linked = await _transactions.GetByRelatedHarvestIdAsync(harvestId, cancellationToken);
        var summary = FinancialCalculator.BuildHarvestSummary(harvest.Id, harvest.FieldId, linked);
        return FinancialTransactionMapper.ToDto(summary, language);
    }

    private async Task<List<Field>> ResolveSummaryFieldsAsync(
        string? fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(fieldId))
        {
            var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
                ?? throw new NotFoundException("Field not found.");
            if (field.Status == FieldStatus.Draft)
            {
                throw new ValidationException("Draft fields are not included in financial results.");
            }

            var access = await _authorization.ResolveForFieldAsync(field.Id, userId, userRole, cancellationToken);
            if (!access.Can(FinancialCapabilities.ViewSummary))
            {
                throw new ForbiddenException("You do not have access to the yearly financial result.");
            }

            return [field];
        }

        if (userRole == Roles.Administrator)
        {
            throw new ValidationException("A field filter is required for administrators.");
        }

        var owned = (await _fields.GetByOwnerIdAsync(userId, cancellationToken))
            .Where(f => f.Status != FieldStatus.Draft)
            .ToList();

        var permitted = new List<Field>();
        foreach (var field in owned)
        {
            var access = await _authorization.ResolveForFieldAsync(field.Id, userId, userRole, cancellationToken);
            if (access.Can(FinancialCapabilities.ViewSummary))
            {
                permitted.Add(field);
            }
        }

        if (permitted.Count == 0)
        {
            var unassigned = await _authorization.ResolveForUnassignedAsync(userId, userRole, cancellationToken);
            if (!unassigned.Can(FinancialCapabilities.ViewSummary))
            {
                throw new ForbiddenException("You do not have access to the yearly financial result.");
            }
        }

        return permitted;
    }

    private async Task<List<HarvestRecord>> LoadPostedHarvestsAsync(
        IReadOnlyList<string> fieldIds,
        int year,
        CancellationToken cancellationToken)
    {
        if (fieldIds.Count == 0)
        {
            return [];
        }

        var harvests = await _harvests.GetByFieldIdsAsync(fieldIds, cancellationToken);
        return harvests
            .Where(h => h.Status == FinancialEntryStatus.Posted)
            .Where(h => ResolveHarvestResultYear(h) == year)
            .ToList();
    }

    private static decimal? SumOilKilograms(IReadOnlyCollection<HarvestRecord> harvests)
    {
        var oilValues = harvests
            .Select(h => h.OilKg)
            .Where(kg => kg is > 0)
            .Select(kg => (decimal)kg!.Value)
            .ToList();

        return oilValues.Count == 0 ? null : oilValues.Sum();
    }

    internal static HarvestOilProduction ResolveOilProduction(IEnumerable<HarvestRecord> harvests)
    {
        decimal confirmed = 0;
        decimal estimated = 0;
        var hasConfirmed = false;
        var hasEstimated = false;
        foreach (var harvest in harvests)
        {
            if (harvest.OilLitres is > 0)
            {
                confirmed += harvest.OilLitres.Value;
                hasConfirmed = true;
                continue;
            }

            if (harvest.OilKg is > 0 && harvest.ConversionFactor is > 0)
            {
                estimated += (decimal)harvest.OilKg.Value / harvest.ConversionFactor.Value;
                hasEstimated = true;
            }
        }

        return new HarvestOilProduction(
            hasConfirmed ? FinancialQuantityCalculator.RoundQuantity(confirmed) : null,
            hasEstimated ? FinancialQuantityCalculator.RoundQuantity(estimated) : null);
    }

    /// <summary>
    /// Oil and harvest year totals use ResultYear so January continuation stays on the prior result year.
    /// </summary>
    internal static int ResolveHarvestResultYear(HarvestRecord harvest) =>
        harvest.ResultYear > 0
            ? harvest.ResultYear
            : AthensTime.CalendarYear(harvest.HarvestDate);

    private static FinancialFieldMetrics ToMetrics(Field field) =>
        new(field.Id, field.Name, field.ResolveAreaHectares());
}
