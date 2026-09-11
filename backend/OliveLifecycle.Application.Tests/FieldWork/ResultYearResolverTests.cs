using OliveLifecycle.Core.FieldWork;
using Xunit;

namespace OliveLifecycle.Application.Tests.FieldWork;

public class ResultYearResolverTests
{
    [Fact]
    public void Resolve_DefaultsToAgriculturalYearOfPlannedDate()
    {
        var planned = new DateTime(2026, 3, 18, 10, 0, 0, DateTimeKind.Utc);
        var year = ResultYearResolver.Resolve(planned, explicitResultYear: null, utcNow: planned);
        Assert.Equal(2026, year);
    }

    [Fact]
    public void Resolve_KeepsJanuaryInsidePreviousAgriculturalYear()
    {
        var taskDate = new DateTime(2027, 1, 5, 8, 0, 0, DateTimeKind.Utc);
        var year = ResultYearResolver.Resolve(taskDate, explicitResultYear: null, utcNow: taskDate);
        Assert.Equal(2026, year);
    }

    [Fact]
    public void Resolve_UsesExplicitResultYear_ForJanuaryHarvestContinuation()
    {
        var taskDate = new DateTime(2027, 1, 5, 8, 0, 0, DateTimeKind.Utc);
        var year = ResultYearResolver.Resolve(taskDate, explicitResultYear: 2026, utcNow: taskDate);
        Assert.Equal(2026, year);
    }

    [Fact]
    public void ForHarvestContinuation_KeepsHarvestYear()
    {
        var taskDate = new DateTime(2027, 1, 5, 8, 0, 0, DateTimeKind.Utc);
        Assert.Equal(2026, ResultYearResolver.ForHarvestContinuation(taskDate, 2026));
    }

    [Fact]
    public void Resolve_FallsBackToUtcNowWhenNoPlannedDate()
    {
        var now = new DateTime(2026, 9, 10, 12, 0, 0, DateTimeKind.Utc);
        Assert.Equal(2026, ResultYearResolver.Resolve(null, null, now));
    }
}
