using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Reports;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public interface IReportsService
{
    Task<IEnumerable<FieldSummaryReportDto>> GetFieldSummariesAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<IEnumerable<HarvestRecordDto>> GetHarvestRecordsAsync(string userId, string userRole, CancellationToken cancellationToken = default);
    Task<ProfitLossReportDto> GetProfitLossAsync(string userId, string userRole, CancellationToken cancellationToken = default);
}

public class ReportsService : IReportsService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IHarvestRecordRepository _harvestRecordRepository;
    private readonly IDateTimeProvider _dateTimeProvider;

    public ReportsService(
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IHarvestRecordRepository harvestRecordRepository,
        IDateTimeProvider dateTimeProvider)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _harvestRecordRepository = harvestRecordRepository;
        _dateTimeProvider = dateTimeProvider;
    }

    public async Task<IEnumerable<FieldSummaryReportDto>> GetFieldSummariesAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var fields = await GetAccessibleFieldsAsync(userId, userRole, cancellationToken);
        var fieldIds = fields.Select(f => f.Id).ToList();
        var tasks = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.TaskItem>()
            : await _taskRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);
        var harvests = fieldIds.Count == 0
            ? Enumerable.Empty<Core.Entities.HarvestRecord>()
            : await _harvestRecordRepository.GetByFieldIdsAsync(fieldIds, cancellationToken);

        var now = _dateTimeProvider.UtcNow;
        return fields.Select(field =>
        {
            var fieldTasks = tasks.Where(t => t.FieldId == field.Id).ToList();
            var fieldHarvests = harvests.Where(h => h.FieldId == field.Id).ToList();
            var totalProduction = fieldHarvests.Sum(h => h.OliveKg);
            var totalCost = fieldTasks.Where(t => t.Status == WorkTaskStatus.Completed).Sum(t => t.Cost ?? 0);

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
        CancellationToken cancellationToken = default)
    {
        var fields = await GetAccessibleFieldsAsync(userId, userRole, cancellationToken);
        var fieldMap = fields.ToDictionary(f => f.Id, f => f.Name);
        var records = await _harvestRecordRepository.GetByFieldIdsAsync(fieldMap.Keys, cancellationToken);

        return records.Select(r =>
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
                Notes = r.Notes
            };
        });
    }

    public async Task<ProfitLossReportDto> GetProfitLossAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (userRole != Roles.FieldOwner && userRole != Roles.Administrator)
        {
            throw new ForbiddenException("You do not have permission to view profit and loss reports.");
        }

        var summaries = (await GetFieldSummariesAsync(userId, userRole, cancellationToken)).ToList();
        var profitByField = summaries.Select(s => new FieldProfitDto
        {
            FieldId = s.FieldId,
            FieldName = s.FieldName,
            Cost = s.TotalCost,
            Revenue = 0,
            Profit = -s.TotalCost
        }).ToList();

        var totalExpenses = profitByField.Sum(p => p.Cost);
        return new ProfitLossReportDto
        {
            Season = _dateTimeProvider.UtcNow.Year.ToString(),
            TotalIncome = 0,
            TotalExpenses = totalExpenses,
            NetProfit = -totalExpenses,
            ProfitByField = profitByField
        };
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
