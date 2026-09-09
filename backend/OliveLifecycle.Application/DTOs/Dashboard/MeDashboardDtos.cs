using OliveLifecycle.Application.DTOs.Activity;

namespace OliveLifecycle.Application.DTOs.Dashboard;

public class MeDashboardDto
{
    public string Period { get; set; } = "week";
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public MeDashboardCountsDto Counts { get; set; } = new();
    public MeDashboardCountsDto PreviousCounts { get; set; } = new();
    public IReadOnlyList<MeDashboardSeriesPointDto> Series { get; set; } = Array.Empty<MeDashboardSeriesPointDto>();
    public string TopAction { get; set; } = MeDashboardTopActions.None;
    public MeDashboardPendingDto Pending { get; set; } = new();
    public IReadOnlyList<ActivityDto> Recent { get; set; } = Array.Empty<ActivityDto>();
}

public class MeDashboardCountsDto
{
    public int TasksCompleted { get; set; }
    public int TasksStarted { get; set; }
    public int EvidenceAdded { get; set; }
    public int HarvestsRecorded { get; set; }
    public int ExpensesLogged { get; set; }
    public int ContactsSent { get; set; }

    public int TotalWrites =>
        TasksCompleted + TasksStarted + EvidenceAdded + HarvestsRecorded + ExpensesLogged + ContactsSent;
}

public class MeDashboardSeriesPointDto
{
    public DateTime Date { get; set; }
    public int Total { get; set; }
}

public class MeDashboardPendingDto
{
    public int Overdue { get; set; }
    public int DueToday { get; set; }
    public int PendingApproval { get; set; }
}

public static class MeDashboardTopActions
{
    public const string CompleteTask = "complete_task";
    public const string AddEvidence = "add_evidence";
    public const string LogHarvest = "log_harvest";
    public const string LogExpense = "log_expense";
    public const string ContactPartner = "contact_partner";
    public const string None = "none";
}

public static class MeDashboardPeriods
{
    public const string Today = "today";
    public const string Week = "week";
    public const string Month = "month";
}
