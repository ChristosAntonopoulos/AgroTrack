using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services;

public interface ITasksDomainMigrationService
{
    /// <summary>
    /// Dry-run by default. Pass confirm=true (--confirm) for destructive writes.
    /// Does not emit Chronologio/History rows.
    /// </summary>
    Task<TasksDomainMigrationReport> RunAsync(bool confirm, CancellationToken cancellationToken = default);
}

public sealed class TasksDomainMigrationReport
{
    public bool Confirmed { get; set; }
    public Dictionary<string, int> StatusCountsBefore { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int> StatusCountsAfter { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int> OwnerCounts { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public int TasksUpdated { get; set; }
    public int ExecutionsLinked { get; set; }
    public int OpenProposalsDeleted { get; set; }
    public int TasksScanned { get; set; }
    public int ExecutionsScanned { get; set; }
    public List<string> Messages { get; set; } = [];
}

public class TasksDomainMigrationService : ITasksDomainMigrationService
{
    private readonly IFieldTaskRepository _tasks;
    private readonly ITaskExecutionRepository _executions;
    private readonly ITaskProposalRepository _proposals;
    private readonly ILogger<TasksDomainMigrationService> _logger;

    public TasksDomainMigrationService(
        IFieldTaskRepository tasks,
        ITaskExecutionRepository executions,
        ITaskProposalRepository proposals,
        ILogger<TasksDomainMigrationService> logger)
    {
        _tasks = tasks;
        _executions = executions;
        _proposals = proposals;
        _logger = logger;
    }

    public async Task<TasksDomainMigrationReport> RunAsync(bool confirm, CancellationToken cancellationToken = default)
    {
        var report = new TasksDomainMigrationReport { Confirmed = confirm };
        var allTasks = await _tasks.GetAllAsync(cancellationToken);
        var allExecutions = await _executions.GetAllAsync(cancellationToken);
        report.TasksScanned = allTasks.Count;
        report.ExecutionsScanned = allExecutions.Count;

        foreach (var task in allTasks)
        {
            var key = task.Status.ToApiString();
            report.StatusCountsBefore[key] = report.StatusCountsBefore.GetValueOrDefault(key) + 1;
            var owner = string.IsNullOrWhiteSpace(task.OwnerId) ? task.CreatedByUserId : task.OwnerId;
            if (!string.IsNullOrWhiteSpace(owner))
            {
                report.OwnerCounts[owner] = report.OwnerCounts.GetValueOrDefault(owner) + 1;
            }
        }

        report.Messages.Add($"Scanned {allTasks.Count} tasks and {allExecutions.Count} work records/executions.");
        report.Messages.Add(confirm
            ? "Running with --confirm (writes enabled)."
            : "Dry-run only. Pass --confirm to apply destructive changes.");

        // Open proposals (active/snoozed) — delete on confirm
        var openProposals = await _proposals.QueryAsync(
            new TaskProposalQuery
            {
                Statuses =
                [
                    TaskProposalStatus.Active,
                    TaskProposalStatus.Snoozed
                ]
            },
            cancellationToken);
        report.OpenProposalsDeleted = openProposals.Count;
        report.Messages.Add($"Open proposals to delete: {openProposals.Count}");

        if (confirm)
        {
            foreach (var proposal in openProposals)
            {
                await _proposals.DeleteAsync(proposal.Id, cancellationToken);
            }
        }

        var executionsByTask = allExecutions
            .Where(e => !string.IsNullOrWhiteSpace(e.TaskId) && e.IsActive)
            .GroupBy(e => e.TaskId!, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(e => e.CompletedAt).First(), StringComparer.Ordinal);

        foreach (var task in allTasks)
        {
            var changed = false;

            // Status already normalized by FromApiString on read; rewrite stored API string on confirm
            var targetStatus = task.Status;
            if (string.IsNullOrWhiteSpace(task.OwnerId))
            {
                task.OwnerId = task.CreatedByUserId;
                changed = true;
            }

            if (task.ScheduledFor is null && task.PlannedStart is not null)
            {
                task.ScheduledFor = task.PlannedStart;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(task.AssigneeId) && !string.IsNullOrWhiteSpace(task.AssignedUserId))
            {
                task.AssigneeId = task.AssignedUserId;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(task.Note) && !string.IsNullOrWhiteSpace(task.Notes))
            {
                task.Note = task.Notes;
                changed = true;
            }

            task.Source = string.IsNullOrWhiteSpace(task.TemplateCode) ? TaskSource.Custom : TaskSource.Template;

            if (executionsByTask.TryGetValue(task.Id, out var execution))
            {
                if (!string.Equals(task.LinkedWorkRecordId, execution.Id, StringComparison.Ordinal))
                {
                    task.LinkedWorkRecordId = execution.Id;
                    task.LatestExecutionId = execution.Id;
                    changed = true;
                    report.ExecutionsLinked++;
                }

                if (string.IsNullOrWhiteSpace(execution.OwnerId))
                {
                    execution.OwnerId = task.OwnerId;
                    if (confirm)
                    {
                        await _executions.UpdateAsync(execution, cancellationToken);
                    }
                }

                if (targetStatus == FieldTaskStatus.Done && task.CompletedAt is null)
                {
                    task.CompletedAt = execution.CompletedAt;
                    task.CompletedByUserId = execution.RecordedByUserId;
                    changed = true;
                }
            }

            // Always rewrite status to canonical API string on confirm
            changed = true;
            report.TasksUpdated++;

            var afterKey = targetStatus.ToApiString();
            report.StatusCountsAfter[afterKey] = report.StatusCountsAfter.GetValueOrDefault(afterKey) + 1;

            if (confirm && changed)
            {
                task.UpdatedAt = DateTime.UtcNow;
                await _tasks.UpdateAsync(task, cancellationToken);
            }
        }

        // Also normalize standalone executions (owner / title)
        foreach (var execution in allExecutions)
        {
            if (!confirm)
            {
                continue;
            }

            var touched = false;
            if (string.IsNullOrWhiteSpace(execution.OwnerId) && !string.IsNullOrWhiteSpace(execution.RecordedByUserId))
            {
                execution.OwnerId = execution.RecordedByUserId;
                touched = true;
            }

            if (touched)
            {
                execution.UpdatedAt = DateTime.UtcNow;
                await _executions.UpdateAsync(execution, cancellationToken);
            }
        }

        _logger.LogInformation(
            "Tasks domain migration finished. Confirm={Confirm} TasksUpdated={Tasks} ProposalsDeleted={Proposals} Links={Links}",
            confirm,
            report.TasksUpdated,
            confirm ? report.OpenProposalsDeleted : 0,
            report.ExecutionsLinked);

        return report;
    }
}
