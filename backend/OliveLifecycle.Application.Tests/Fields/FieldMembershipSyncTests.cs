using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using Xunit;

namespace OliveLifecycle.Application.Tests.Fields;

public class FieldMembershipSyncTests
{
    [Fact]
    public void EnsureBackfilled_OwnerGetsOwnAndWork()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Lower Grove",
            OwnerId = "owner-1",
            CreatedAt = DateTime.UtcNow
        };

        FieldMembershipSync.EnsureBackfilled(field);

        Assert.Single(field.Memberships);
        Assert.Equal("owner-1", field.Memberships[0].UserId);
        Assert.Contains(FieldCapacities.Own, field.Memberships[0].Capacities);
        Assert.Contains(FieldCapacities.Work, field.Memberships[0].Capacities);
    }

    [Fact]
    public void EnsureBackfilled_AssignedProducersGetWork()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Upper Grove",
            OwnerId = "owner-1",
            AssignedProducerIds = ["prod-1", "prod-2"],
            CreatedAt = DateTime.UtcNow
        };

        FieldMembershipSync.EnsureBackfilled(field);

        Assert.Equal(3, field.Memberships.Count);
        Assert.True(FieldMembershipSync.HasCapacity(field, "prod-1", FieldCapacities.Work));
        Assert.True(FieldMembershipSync.HasCapacity(field, "prod-2", FieldCapacities.Work));
        Assert.False(FieldMembershipSync.HasCapacity(field, "prod-1", FieldCapacities.Own));
    }

    [Fact]
    public void Upsert_AdvisorCanAdviseWithoutOwning()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Shared",
            OwnerId = "owner-1",
            CreatedAt = DateTime.UtcNow
        };

        FieldMembershipSync.EnsureBackfilled(field);
        FieldMembershipSync.Upsert(field, "agro-1", [FieldCapacities.Advise], "owner-1");

        Assert.True(FieldMembershipSync.IsMember(field, "agro-1"));
        Assert.True(FieldMembershipSync.HasCapacity(field, "agro-1", FieldCapacities.Advise));
        Assert.False(FieldMembershipSync.HasCapacity(field, "agro-1", FieldCapacities.Own));
        Assert.Equal("owner-1", field.OwnerId);
    }

    [Fact]
    public void Upsert_OwnerWhoWorksKeepsOwnPlusWork()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Solo",
            OwnerId = "owner-1",
            CreatedAt = DateTime.UtcNow
        };

        FieldMembershipSync.Upsert(field, "owner-1", [FieldCapacities.Own, FieldCapacities.Work], null);

        Assert.True(FieldMembershipSync.HasCapacity(field, "owner-1", FieldCapacities.Own));
        Assert.True(FieldMembershipSync.HasCapacity(field, "owner-1", FieldCapacities.Work));
    }
}
