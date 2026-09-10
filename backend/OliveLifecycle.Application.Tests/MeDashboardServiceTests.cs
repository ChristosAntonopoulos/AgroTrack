using OliveLifecycle.Application.DTOs.Dashboard;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class MeDashboardServiceTests
{
    private static readonly DateTime Now = new(2026, 3, 15, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(null, MeDashboardPeriods.Week)]
    [InlineData("week", MeDashboardPeriods.Week)]
    [InlineData("TODAY", MeDashboardPeriods.Today)]
    [InlineData("month", MeDashboardPeriods.Month)]
    [InlineData("nope", MeDashboardPeriods.Week)]
    public void NormalizePeriod_MapsKnownValues(string? input, string expected)
    {
        Assert.Equal(expected, MeDashboardService.NormalizePeriod(input));
    }

    [Fact]
    public void ResolveWindow_Week_IsSevenDaysEndingTomorrow()
    {
        var (from, to) = MeDashboardService.ResolveWindow(MeDashboardPeriods.Week, Now);
        Assert.Equal(new DateTime(2026, 3, 9, 0, 0, 0, DateTimeKind.Utc), from);
        Assert.Equal(new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc), to);
    }

    [Fact]
    public void BuildCounts_UsesActivityTypesAndContacts()
    {
        var activities = new List<Activity>
        {
            Act("task_status_changed", Now.AddDays(-1), new() { ["newStatus"] = "completed" }),
            Act("task_status_changed", Now.AddDays(-1), new() { ["newStatus"] = "in_progress" }),
            Act("evidence_added", Now.AddDays(-2)),
            Act("harvest_recorded", Now.AddDays(-3)),
            Act("task_status_changed", Now.AddDays(-20), new() { ["newStatus"] = "completed" })
        };
        var contacts = new List<ServiceContactRequest>
        {
            new() { CreatedAt = Now.AddDays(-1) },
            new() { CreatedAt = Now.AddDays(-40) }
        };
        var expenses = new List<FinancialTransaction>
        {
            new() { OccurredOn = Now.AddDays(-1), Type = FinancialTransactionType.Expense, Status = FinancialTransactionStatus.Posted },
            new() { OccurredOn = Now.AddDays(-50), Type = FinancialTransactionType.Expense, Status = FinancialTransactionStatus.Posted }
        };

        var (from, to) = MeDashboardService.ResolveWindow(MeDashboardPeriods.Week, Now);
        var counts = MeDashboardService.BuildCounts(activities, contacts, expenses, from, to);

        Assert.Equal(1, counts.TasksCompleted);
        Assert.Equal(1, counts.TasksStarted);
        Assert.Equal(1, counts.EvidenceAdded);
        Assert.Equal(1, counts.HarvestsRecorded);
        Assert.Equal(1, counts.ExpensesLogged);
        Assert.Equal(1, counts.ContactsSent);
    }

    [Fact]
    public void ResolveTopAction_PicksHighestScore_OrNone()
    {
        var empty = MeDashboardService.ResolveTopAction(
            Array.Empty<Activity>(),
            Array.Empty<ServiceContactRequest>(),
            Array.Empty<FinancialTransaction>(),
            Now.AddDays(-14),
            Now);
        Assert.Equal(MeDashboardTopActions.None, empty);

        var activities = new List<Activity>
        {
            Act("evidence_added", Now.AddDays(-1)),
            Act("evidence_added", Now.AddDays(-2)),
            Act("harvest_recorded", Now.AddDays(-1))
        };
        var top = MeDashboardService.ResolveTopAction(
            activities,
            Array.Empty<ServiceContactRequest>(),
            Array.Empty<FinancialTransaction>(),
            Now.AddDays(-14),
            Now);
        Assert.Equal(MeDashboardTopActions.AddEvidence, top);
    }

    [Fact]
    public void BuildPending_CountsOverdueDueToday_UsingFieldTaskStatusesAndActiveExecutions()
    {
        var today = new DateTime(Now.Year, Now.Month, Now.Day, 0, 0, 0, DateTimeKind.Utc);
        var tasks = new List<FieldTask>
        {
            new() { Id = "t1", Status = FieldTaskStatus.Planned, PlannedEnd = today.AddDays(-1) },
            new() { Id = "t2", Status = FieldTaskStatus.InProgress, PlannedEnd = today.AddHours(6) },
            new() { Id = "t3", Status = FieldTaskStatus.Completed, PlannedEnd = today.AddDays(-2) },
            new() { Id = "t4", Status = FieldTaskStatus.Ready, PlannedEnd = today.AddDays(-3) },
            new() { Id = "t5", Status = FieldTaskStatus.Cancelled, PlannedEnd = today.AddDays(-1) }
        };
        var activeExecutions = new HashSet<string>(StringComparer.Ordinal) { "t4" };

        var pending = MeDashboardService.BuildPending(tasks, activeExecutions, Now);
        Assert.Equal(1, pending.Overdue);
        Assert.Equal(1, pending.DueToday);
        Assert.Equal(0, pending.PendingApproval);
        Assert.True(MeDashboardService.IsCompleted(tasks[3], activeExecutions));
        Assert.False(MeDashboardService.IsOpen(tasks[3], activeExecutions));
    }

    private static Activity Act(string type, DateTime at, Dictionary<string, string>? meta = null) =>
        new()
        {
            Type = type,
            Timestamp = at,
            Metadata = meta,
            ActorUserId = "user-1",
            FieldId = "field-1"
        };
}
