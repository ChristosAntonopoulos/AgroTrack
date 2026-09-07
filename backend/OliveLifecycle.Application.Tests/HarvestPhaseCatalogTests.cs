using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class HarvestPhaseCatalogTests
{
    [Theory]
    [InlineData("harvest_ready_nets", "Ready nets and crates", HarvestPhase.Prepare)]
    [InlineData("harvest_book_mill", "Book the mill", HarvestPhase.Prepare)]
    [InlineData("harvest_call_crew", "Call the crew", HarvestPhase.Prepare)]
    [InlineData("harvest_check_access", "Check access and weather", HarvestPhase.Prepare)]
    [InlineData("harvest_planning", "Harvest planning", HarvestPhase.Prepare)]
    [InlineData("harvest_daily_kilos", "Write today's kilos", HarvestPhase.Daily)]
    [InlineData("harvest", "Olive harvest", HarvestPhase.Daily)]
    [InlineData("olive_harvest", "Olive harvest", HarvestPhase.Daily)]
    [InlineData("harvest_mill_delivery", "Take olives to the mill", HarvestPhase.Final)]
    [InlineData("harvest_close_season", "Close this harvest", HarvestPhase.Final)]
    [InlineData("post_harvest_field_inspection", "Post-harvest field inspection", HarvestPhase.Final)]
    public void FromTypeOrTitle_MapsHarvestJobs(string type, string title, HarvestPhase expected)
    {
        Assert.Equal(expected, HarvestPhaseCatalog.FromTypeOrTitle(type, title));
    }

    [Fact]
    public void FromTypeOrTitle_ReturnsNull_ForNonHarvestJobs()
    {
        Assert.Null(HarvestPhaseCatalog.FromTypeOrTitle("pruning", "Winter pruning"));
    }

    [Theory]
    [InlineData("prepare", HarvestPhase.Prepare)]
    [InlineData("daily", HarvestPhase.Daily)]
    [InlineData("final", HarvestPhase.Final)]
    public void FromApiString_ParsesKnownPhases(string value, HarvestPhase expected)
    {
        Assert.Equal(expected, HarvestPhaseExtensions.FromApiString(value));
    }
}
