using OliveLifecycle.Application.DTOs.Dashboard;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core.Entities;
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
        var expenses = new List<FinancialEntry>
        {
            new() { OccurredOn = Now.AddDays(-1), Kind = FinancialEntryKind.Expense, Status = FinancialEntryStatus.Posted },
            new() { OccurredOn = Now.AddDays(-50), Kind = FinancialEntryKind.Expense, Status = FinancialEntryStatus.Posted }
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
            Array.Empty<FinancialEntry>(),
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
            Array.Empty<FinancialEntry>(),
            Now.AddDays(-14),
            Now);
        Assert.Equal(MeDashboardTopActions.AddEvidence, top);
    }

    [Fact]
    public void BuildPending_CountsOverdueDueTodayAndApprovalsForOwners()
    {
        var today = new DateTime(Now.Year, Now.Month, Now.Day, 0, 0, 0, DateTimeKind.Utc);
        var tasks = new List<TaskItem>
        {
            new() { Status = WorkTaskStatus.Pending, ScheduledEnd = today.AddDays(-1) },
            new() { Status = WorkTaskStatus.InProgress, ScheduledEnd = today.AddHours(6) },
            new() { Status = WorkTaskStatus.Completed, ApprovalStatus = ApprovalStatus.Pending },
            new() { Status = WorkTaskStatus.Completed, ApprovalStatus = ApprovalStatus.Approved }
        };

        var ownerPending = MeDashboardService.BuildPending(tasks, Now, Roles.FieldOwner);
        Assert.Equal(1, ownerPending.Overdue);
        Assert.Equal(1, ownerPending.DueToday);
        Assert.Equal(1, ownerPending.PendingApproval);

        var producerPending = MeDashboardService.BuildPending(tasks, Now, Roles.Producer);
        Assert.Equal(0, producerPending.PendingApproval);
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
