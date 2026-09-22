using OliveLifecycle.Application.Photos;
using Xunit;

namespace OliveLifecycle.Application.Tests.Photos;

public class PhotoChunkPlanTests
{
    [Fact]
    public void WritesAContiguousChunk()
    {
        var plan = PhotoChunkPlan.Plan(received: 0, offset: 0, length: 100);
        Assert.False(plan.Conflict);
        Assert.Equal(0, plan.Skip);
    }

    [Fact]
    public void SkipsBytesAlreadyStored()
    {
        var plan = PhotoChunkPlan.Plan(received: 80, offset: 0, length: 100);
        Assert.False(plan.Conflict);
        Assert.Equal(80, plan.Skip);
    }

    [Fact]
    public void RejectsAGap()
    {
        var plan = PhotoChunkPlan.Plan(received: 50, offset: 80, length: 20);
        Assert.True(plan.Conflict);
    }
}
