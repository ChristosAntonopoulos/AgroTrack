using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Activity;
using OliveLifecycle.Application.DTOs.Dashboard;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services;

public interface IMeDashboardService
{
    Task<MeDashboardDto> GetAsync(
        string userId,
        string userRole,
        string? period = null,
        CancellationToken cancellationToken = default);
}

public class MeDashboardService : IMeDashboardService
{
    private static readonly HashSet<string> OwnerRoles = new(StringComparer.Ordinal)
    {
        Roles.FieldOwner,
        Roles.Administrator
    };

    private readonly IActivityRepository _activities;
    private readonly ITaskRepository _tasks;
    private readonly IFieldRepository _fields;
    private readonly IFinancialEntryRepository _financialEntries;
    private readonly IServiceContactRequestRepository _contactRequests;
    private readonly IDateTimeProvider _clock;

    public MeDashboardService(
        IActivityRepository activities,
        ITaskRepository tasks,
        IFieldRepository fields,
        IFinancialEntryRepository financialEntries,
        IServiceContactRequestRepository contactRequests,
        IDateTimeProvider clock)
    {
        _activities = activities;
        _tasks = tasks;
        _fields = fields;
        _financialEntries = financialEntries;
        _contactRequests = contactRequests;
        _clock = clock;
    }

    public async Task<MeDashboardDto> GetAsync(
        string userId,
        string userRole,
        string? period = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedPeriod = NormalizePeriod(period);
        var now = _clock.UtcNow;
        var (from, to) = ResolveWindow(normalizedPeriod, now);
        var previousLength = to - from;
        var previousFrom = from - previousLength;
        var previousTo = from;

        var lookbackFrom = now.AddDays(-90);
        var myActivities = (await _activities.GetByActorUserIdAsync(
            userId,
            lookbackFrom,
            now.AddDays(1),
            limit: 500,
            cancellationToken)).ToList();

        var contacts = await _contactRequests.GetByRequesterUserIdAsync(userId, cancellationToken);
        var fields = (await GetAccessibleFieldsAsync(userId, userRole, cancellationToken)).ToList();
        var fieldIds = fields.Select(f => f.Id).ToList();

        var expenses = fieldIds.Count == 0
            ? new List<FinancialEntry>()
            : (await _financialEntries.GetByFieldIdsAsync(fieldIds, cancellationToken))
                .Where(e =>
                    e.RecordedBy == userId &&
                    e.Status == FinancialEntryStatus.Posted &&
                    e.Kind == FinancialEntryKind.Expense)
                .ToList();

        var counts = BuildCounts(myActivities, contacts, expenses, from, to);
        var previousCounts = BuildCounts(myActivities, contacts, expenses, previousFrom, previousTo);
        var series = BuildSeries(myActivities, contacts, from, to);
        var topAction = ResolveTopAction(myActivities, contacts, expenses, now.AddDays(-14), now);

        var fieldTasks = fieldIds.Count == 0
            ? new List<TaskItem>()
            : (await _tasks.GetByFieldIdsAsync(fieldIds, cancellationToken)).ToList();

        var pending = BuildPending(fieldTasks, now, userRole);

        var recentMine = myActivities
            .Where(a => a.Timestamp >= from && a.Timestamp < to)
            .Take(10)
            .Select(ActivityMapper.ToDto)
            .ToList();

        IReadOnlyList<ActivityDto> recent = recentMine;
        if (OwnerRoles.Contains(userRole) && fieldIds.Count > 0)
        {
            var team = (await _activities.GetByFieldIdsAsync(fieldIds, from, to, limit: 20, cancellationToken))
                .Where(a => a.ActorUserId != userId)
                .Take(10)
                .Select(ActivityMapper.ToDto)
                .ToList();
            recent = recentMine
                .Concat(team)
                .OrderByDescending(a => a.Timestamp)
                .Take(10)
                .ToList();
        }

        return new MeDashboardDto
        {
            Period = normalizedPeriod,
            From = from,
            To = to,
            Counts = counts,
            PreviousCounts = previousCounts,
            Series = series,
            TopAction = topAction,
            Pending = pending,
            Recent = recent
        };
    }

    public static string NormalizePeriod(string? period)
    {
        return period?.Trim().ToLowerInvariant() switch
        {
            MeDashboardPeriods.Today => MeDashboardPeriods.Today,
            MeDashboardPeriods.Month => MeDashboardPeriods.Month,
            _ => MeDashboardPeriods.Week
        };
    }

    public static (DateTime From, DateTime To) ResolveWindow(string period, DateTime nowUtc)
    {
        var today = new DateTime(nowUtc.Year, nowUtc.Month, nowUtc.Day, 0, 0, 0, DateTimeKind.Utc);
        return period switch
        {
            MeDashboardPeriods.Today => (today, today.AddDays(1)),
            MeDashboardPeriods.Month => (today.AddDays(-29), today.AddDays(1)),
            _ => (today.AddDays(-6), today.AddDays(1))
        };
    }

    public static MeDashboardCountsDto BuildCounts(
        IEnumerable<Activity> activities,
        IEnumerable<ServiceContactRequest> contacts,
        IEnumerable<FinancialEntry> expenses,
        DateTime from,
        DateTime to)
    {
        var inRange = activities.Where(a => a.Timestamp >= from && a.Timestamp < to).ToList();
        return new MeDashboardCountsDto
        {
            TasksCompleted = inRange.Count(a =>
                a.Type == "task_status_changed" &&
                HasMeta(a, "newStatus", "completed")),
            TasksStarted = inRange.Count(a =>
                a.Type == "task_status_changed" &&
                HasMeta(a, "newStatus", "in_progress")),
            EvidenceAdded = inRange.Count(a => a.Type == "evidence_added"),
            HarvestsRecorded = inRange.Count(a => a.Type == "harvest_recorded"),
            ExpensesLogged = expenses.Count(e => e.OccurredOn >= from && e.OccurredOn < to),
            ContactsSent = contacts.Count(c => c.CreatedAt >= from && c.CreatedAt < to)
        };
    }

    public static IReadOnlyList<MeDashboardSeriesPointDto> BuildSeries(
        IEnumerable<Activity> activities,
        IEnumerable<ServiceContactRequest> contacts,
        DateTime from,
        DateTime to)
    {
        var points = new List<MeDashboardSeriesPointDto>();
        for (var day = from.Date; day < to.Date; day = day.AddDays(1))
        {
            var dayStart = DateTime.SpecifyKind(day, DateTimeKind.Utc);
            var dayEnd = dayStart.AddDays(1);
            var activityTotal = activities.Count(a => a.Timestamp >= dayStart && a.Timestamp < dayEnd);
            var contactTotal = contacts.Count(c => c.CreatedAt >= dayStart && c.CreatedAt < dayEnd);
            points.Add(new MeDashboardSeriesPointDto
            {
                Date = dayStart,
                Total = activityTotal + contactTotal
            });
        }

        return points;
    }

    public static string ResolveTopAction(
        IEnumerable<Activity> activities,
        IEnumerable<ServiceContactRequest> contacts,
        IEnumerable<FinancialEntry> expenses,
        DateTime from,
        DateTime to)
    {
        var inRange = activities.Where(a => a.Timestamp >= from && a.Timestamp < to).ToList();
        var scores = new Dictionary<string, int>
        {
            [MeDashboardTopActions.CompleteTask] = inRange.Count(a =>
                a.Type == "task_status_changed" && HasMeta(a, "newStatus", "completed")),
            [MeDashboardTopActions.AddEvidence] = inRange.Count(a => a.Type == "evidence_added"),
            [MeDashboardTopActions.LogHarvest] = inRange.Count(a => a.Type == "harvest_recorded"),
            [MeDashboardTopActions.LogExpense] = expenses.Count(e =>
                e.OccurredOn >= from && e.OccurredOn < to),
            [MeDashboardTopActions.ContactPartner] = contacts.Count(c =>
                c.CreatedAt >= from && c.CreatedAt < to)
        };

        var best = scores.OrderByDescending(kv => kv.Value).First();
        return best.Value <= 0 ? MeDashboardTopActions.None : best.Key;
    }

    public static MeDashboardPendingDto BuildPending(
        IEnumerable<TaskItem> tasks,
        DateTime nowUtc,
        string userRole)
    {
        var today = new DateTime(nowUtc.Year, nowUtc.Month, nowUtc.Day, 0, 0, 0, DateTimeKind.Utc);
        var tomorrow = today.AddDays(1);
        var open = tasks.Where(t => t.Status != WorkTaskStatus.Completed).ToList();

        return new MeDashboardPendingDto
        {
            Overdue = open.Count(t => t.ScheduledEnd.HasValue && t.ScheduledEnd.Value < today),
            DueToday = open.Count(t =>
                t.ScheduledEnd.HasValue &&
                t.ScheduledEnd.Value >= today &&
                t.ScheduledEnd.Value < tomorrow),
            PendingApproval = OwnerRoles.Contains(userRole)
                ? tasks.Count(t =>
                    t.Status == WorkTaskStatus.Completed &&
                    t.ApprovalStatus == ApprovalStatus.Pending)
                : 0
        };
    }

    private async Task<IEnumerable<Field>> GetAccessibleFieldsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (OwnerRoles.Contains(userRole))
        {
            return await _fields.GetByOwnerIdAsync(userId, cancellationToken);
        }

        if (userRole == Roles.Producer)
        {
            return await _fields.GetByAssignedProducerIdAsync(userId, cancellationToken);
        }

        return await _fields.GetByMemberUserIdAsync(userId, cancellationToken);
    }

    private static bool HasMeta(Activity activity, string key, string expected)
    {
        if (activity.Metadata == null || !activity.Metadata.TryGetValue(key, out var value))
        {
            return false;
        }

        return string.Equals(value, expected, StringComparison.OrdinalIgnoreCase);
    }
}
