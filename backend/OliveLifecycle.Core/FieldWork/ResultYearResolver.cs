using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Resolves ResultYear for proposals, tasks, executions, and harvests.
/// Defaults to the olive agricultural year (1 Feb Y – 31 Jan Y+1) so a harvest
/// that continues in January is not split across two result years.
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
            return AgriculturalYear.For(plannedDate.Value);
        }

        return AgriculturalYear.For(utcNow);
    }

    /// <summary>
    /// Example: task date 5 Jan 2027 with harvest year 2026 keeps ResultYear 2026.
    /// </summary>
    public static int ForHarvestContinuation(DateTime taskDate, int harvestResultYear) =>
        harvestResultYear;
}
