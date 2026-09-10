using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Resolves ResultYear for proposals, tasks, executions, and harvests.
/// Defaults to the Athens calendar year of the planned date; callers may keep
/// the previous harvest year when work continues into January.
/// </summary>
public static class ResultYearResolver
{
    public static int Resolve(DateTime? plannedDate, int? explicitResultYear, DateTime utcNow)
    {
        if (explicitResultYear.HasValue)
        {
            return explicitResultYear.Value;
        }

        if (plannedDate.HasValue)
        {
            return AthensTime.CalendarYear(plannedDate.Value);
        }

        return AthensTime.CalendarYear(utcNow);
    }

    /// <summary>
    /// Example: task date 5 Jan 2027 with harvest year 2026 keeps ResultYear 2026.
    /// </summary>
    public static int ForHarvestContinuation(DateTime taskDate, int harvestResultYear) =>
        harvestResultYear;
}
