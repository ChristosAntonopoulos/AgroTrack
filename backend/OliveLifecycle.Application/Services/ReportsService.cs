using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Reports;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public interface IReportsService
{
    Task<IEnumerable<FieldSummaryReportDto>> GetFieldSummariesAsync(string userId, string userRole, string? lifecycleYear = null, string? season = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<HarvestRecordDto>> GetHarvestRecordsAsync(string userId, string userRole, string? lifecycleYear = null, string? season = null, CancellationToken cancellationToken = default);
    Task<ProfitLossReportDto> GetProfitLossAsync(string userId, string userRole, string? lifecycleYear = null, string? season = null, CancellationToken cancellationToken = default);
}

public class ReportsService : IReportsService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly IFinancialEntryRepository _financialEntryRepository;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ReportsService(
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IHarvestRecordRepository harvestRecordRepository,
        IFinancialEntryRepository financialEntryRepository,
        IDateTimeProvider dateTimeProvider)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _harvestRecordRepository = harvestRecordRepository;
        _financialEntryRepository = financialEntryRepository;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<IEnumerable<FieldSummaryReportDto>> GetFieldSummariesAsync(
        string userId,
        string userRole,
        string? lifecycleYear = null,
        string? season = null,
        CancellationToken cancellationToken = default)
    {
        var fields = await GetAccessibleFieldsAsync(userId, userRole, cancellationToken);
        fields = FilterFields(fields, lifecycleYear);
        var fieldIds = fields.Select(f => f.Id).ToList();
        var tasks = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.TaskItem>()
            : await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var harvests = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.HarvestRecord>()
            : await _harvestRecordRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var ledger = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.FinancialEntry>()
            : await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);

        var now = _dateTimeProvider.UtcNow;
        return fields.Select(field =>
        {
            var fieldTasks = tasks.Where(t => t.FieldId == field.Id).ToList();
            var fieldHarvests = harvests
                .Where(h => h.FieldId == field.Id && MatchesSeason(h.HarvestDate, season) && h.Status != FinancialEntryStatus.Voided)
                .ToList();
            var fieldEntries = ledger
                .Where(e => e.FieldId == field.Id && MatchesSeason(e.OccurredOn, season) && MatchesLifecycleYear(e.LifecycleYear, lifecycleYear))
                .ToList();
            var totalProduction = fieldHarvests.Sum(h => h.OliveKg);
            var totalCost = SumFieldCost(fieldEntries, fieldTasks);

            return new FieldSummaryReportDto
            {
                FieldId = field.Id,
                FieldName = field.Name,
                AreaHa = field.Area,
                Variety = field.Variety,
                TreeAge = field.TreeAge,
                TasksCompleted = fieldTasks.Count(t => t.Status == WorkTaskStatus.Completed),
                TasksPending = fieldTasks.Count(t => t.Status == WorkTaskStatus.Pending),
                TasksOverdue = fieldTasks.Count(t =>
                    t.Status != WorkTaskStatus.Completed &&
                    t.ScheduledEnd.HasValue &&
                    t.ScheduledEnd.Value < now),
                TotalCost = totalCost,
                TotalProductionKg = totalProduction,
                YieldPerHa = field.Area > 0 ? totalProduction / field.Area : 0
            };
        });
    }

    public async Task<IEnumerable<HarvestRecordDto>> GetHarvestRecordsAsync(
        string userId,
        string userRole,
        string? lifecycleYear = null,
        string? season = null,
        CancellationToken cancellationToken = default)
    {
        var fields = FilterFields(await GetAccessibleFieldsAsync(userId, userRole, cancellationToken), lifecycleYear);
        var fieldMap = fields.ToDictionary(f => f.Id, f => f.Name);
        var records = await _harvestRecordRepository.GetByFieldIdsAsync(fieldMap.Keys, cancellationToken);

        return records
            .Where(r => r.Status != FinancialEntryStatus.Voided && MatchesSeason(r.HarvestDate, season))
            .Select(r =>
        {
            fieldMap.TryGetValue(r.FieldId, out var fieldName);
            var area = fields.FirstOrDefault(f => f.Id == r.FieldId)?.Area ?? 0;
            return new HarvestRecordDto
            {
                Id = r.Id,
                FieldId = r.FieldId,
                FieldName = fieldName ?? r.FieldId,
                HarvestDate = r.HarvestDate,
                HarvestMethod = r.HarvestMethod,
                WorkersUsed = r.WorkersUsed,
                OliveKg = r.OliveKg,
                KgPerHa = area > 0 ? r.OliveKg / area : 0,
                MillName = r.MillName,
                OilKg = r.OilKg,
                OilYieldPercent = r.OilYieldPercent,
                QualityGrade = r.QualityGrade,
                Notes = r.Notes,
                Status = r.Status.ToApiString()
            };
        });
    }

    public async Task<ProfitLossReportDto> GetProfitLossAsync(
        string userId,
        string userRole,
        string? lifecycleYear = null,
        string? season = null,
        CancellationToken cancellationToken = default)
    {
        if (userRole != Roles.FieldOwner && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to view profit and loss reports.");
        }

        var fields = FilterFields(await GetAccessibleFieldsAsync(userId, userRole, cancellationToken), lifecycleYear).ToList();
        var fieldIds = fields.Select(f => f.Id).ToList();
        var tasks = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.TaskItem>()
            : await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var ledger = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.FinancialEntry>()
            : await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);

        var profitByField = fields.Select(field =>
        {
            var fieldEntries = ledger
                .Where(e => e.FieldId == field.Id && MatchesSeason(e.OccurredOn, season) && MatchesLifecycleYear(e.LifecycleYear, lifecycleYear))
                .ToList();
            var fieldTasks = tasks.Where(t => t.FieldId == field.Id);
            var cost = SumFieldCost(fieldEntries, fieldTasks);
            var revenue = fieldEntries
                .Where(e => e.Kind == FinancialEntryKind.Income && e.Status == FinancialEntryStatus.Posted)
                .Sum(e => e.Amount);
            return new FieldProfitDto
            {
                FieldId = field.Id,
                FieldName = field.Name,
                Cost = cost,
                Revenue = revenue,
                Profit = revenue - cost
            };
        }).ToList();

        var totalExpenses = profitByField.Sum(p => p.Cost);
        var totalIncome = profitByField.Sum(p => p.Revenue);
        var postedExpenses = ledger
            .Where(e =>
                e.Kind == FinancialEntryKind.Expense &&
                e.Status == FinancialEntryStatus.Posted &&
                MatchesSeason(e.OccurredOn, season) &&
                MatchesLifecycleYear(e.LifecycleYear, lifecycleYear))
            .ToList();
        var expensesByBucket = postedExpenses
            .GroupBy(e => (e.Bucket ?? FinancialCategoryBucket.Other).ToApiString())
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));
        var expensesByCategory = postedExpenses
            .Where(e => e.Category.HasValue)
            .GroupBy(e => e.Category!.Value.ToApiString())
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        return new ProfitLossReportDto
        {
            Season = string.IsNullOrWhiteSpace(season) ? _dateTimeProvider.UtcNow.Year.ToString() : season.Trim(),
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            NetProfit = totalIncome - totalExpenses,
            ProfitByField = profitByField,
            ExpensesByBucket = expensesByBucket,
            ExpensesByCategory = expensesByCategory
        };
    }

    private static IEnumerable<Core.Entities.Field> FilterFields(
        IEnumerable<Core.Entities.Field> fields,
        string? lifecycleYear)
    {
        if (string.IsNullOrWhiteSpace(lifecycleYear))
        {
            return fields;
        }

        var year = lifecycleYear.Trim().ToLowerInvariant();
        return fields.Where(f => string.Equals(f.CurrentLifecycleYear, year, StringComparison.OrdinalIgnoreCase));
    }

    private static bool MatchesLifecycleYear(string? entryYear, string? filterYear)
    {
        if (string.IsNullOrWhiteSpace(filterYear))
        {
            return true;
        }

        return string.Equals(entryYear, filterYear.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesSeason(DateTime date, string? season)
    {
        if (string.IsNullOrWhiteSpace(season))
        {
            return true;
        }

        return int.TryParse(season.Trim(), out var year) && date.Year == year;
    }

    private static decimal SumFieldCost(
        IEnumerable<Core.Entities.FinancialEntry> entries,
        IEnumerable<Core.Entities.TaskItem> fieldTasks)
    {
        var posted = entries
            .Where(e => e.Status == FinancialEntryStatus.Posted)
            .ToList();
        if (posted.Count > 0)
        {
            return posted.Where(e => e.Kind == FinancialEntryKind.Expense).Sum(e => e.Amount);
        }

        return fieldTasks.Where(t => t.Status == WorkTaskStatus.Completed).Sum(t => t.Cost ?? 0);
    }

    private async Task<IEnumerable<Core.Entities.Field>> GetAccessibleFieldsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (userRole == Roles.FieldOwner || userRole == Roles.Administrator)
        {
            return await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken);
        }

        if (userRole == Roles.Producer)
        {
            var assigned = await _fieldRepository.GetByAssignedProducerIdAsync(userId, cancellationToken);
            return assigned;
        }

        throw new ForbiddenException("You do not have permission to view reports.");
    }
}
