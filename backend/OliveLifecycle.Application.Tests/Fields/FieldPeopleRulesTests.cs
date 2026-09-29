using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests.Fields;

public class FieldPeopleRulesTests
{
    [Fact]
    public void EnsureNormalized_BackfillsAdminFromOwnerId()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Lower Grove",
            OwnerId = "owner-1",
            CreatedAt = DateTime.UtcNow
        };

        FieldPeopleRules.EnsureNormalized(field);

        Assert.Single(field.People);
        Assert.Equal(FieldPersonRole.Admin, field.People[0].Role);
        Assert.Equal("owner-1", field.People[0].UserId);
        Assert.Equal(FamilyAccessLevels.Work, field.People[0].AccessLevel);
        Assert.Equal("owner-1", field.OwnerId);
    }

    [Fact]
    public void EnsureNormalized_PreservesExistingPeople()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Shared",
            OwnerId = "owner-1",
            People =
            [
                FieldPeopleRules.CreateAdminSeat("owner-1"),
                new FieldPerson
                {
                    UserId = "prod-1",
                    Role = FieldPersonRole.Partner,
                    Modules = FamilyModules.DefaultOnInvite.ToList(),
                    AccessLevel = FamilyAccessLevels.Work,
                    Status = FamilyMemberStatuses.Active
                }
            ]
        };

        FieldPeopleRules.EnsureNormalized(field);

        Assert.Equal(2, field.People.Count);
        Assert.Equal(FieldPersonRole.Admin, field.People[0].Role);
        Assert.Equal(FieldPersonRole.Partner, field.People[1].Role);
    }

    [Fact]
    public void AddOrReplaceSeat_AllowsManyCollaboratorsAndFamily()
    {
        var field = AdminField();
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "p1", FamilyModules.DefaultOnInvite, FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "p2", FamilyModules.DefaultOnInvite, FamilyAccessLevels.View, "owner-1",
            status: FamilyMemberStatuses.Pending);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Family, "f1", FamilyModules.DefaultOnInvite, FamilyAccessLevels.Help, "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Family, "f2", FamilyModules.DefaultOnInvite, FamilyAccessLevels.View, "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Family, "f3", FamilyModules.DefaultOnInvite, FamilyAccessLevels.View, "owner-1",
            status: FamilyMemberStatuses.Active);

        Assert.Equal(6, field.People.Count);
        Assert.Single(field.People, person => person.Role == FieldPersonRole.Admin);
    }

    [Fact]
    public void PendingCollaborator_DoesNotBlockAnotherCollaborator()
    {
        var field = AdminField();
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, null, FamilyModules.DefaultOnInvite, FamilyAccessLevels.Work, "owner-1",
            displayName: "Kostas", email: "k@x.com", inviteId: "inv-1", status: FamilyMemberStatuses.Pending);

        var second = FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "other", FamilyModules.DefaultOnInvite, FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);

        Assert.Equal("other", second.UserId);
        Assert.Equal(3, field.People.Count);
    }

    [Fact]
    public void TryParseRelationship_MapsCollaboratorToPartner_AndRejectsOwner()
    {
        Assert.True(FieldPeopleRules.TryParseRelationship("Collaborator", out var collaborator));
        Assert.Equal(FieldPersonRole.Partner, collaborator);
        Assert.True(FieldPeopleRules.TryParseRelationship("Family", out var family));
        Assert.Equal(FieldPersonRole.Family, family);
        Assert.False(FieldPeopleRules.TryParseRelationship("Owner", out _));
        Assert.False(FieldPeopleRules.TryParseRelationship("Admin", out _));
    }

    [Fact]
    public void IsAdmin_TrueForAdminSeat()
    {
        var field = AdminField();
        Assert.True(FieldPeopleRules.IsAdmin(field, "owner-1"));
        Assert.False(FieldPeopleRules.IsAdmin(field, "stranger"));
    }

    [Fact]
    public void HasModule_AdminHasAll_PartnerOnlyGranted()
    {
        var field = AdminField();
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "p1",
            [FamilyModules.Fields, FamilyModules.Tasks], FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);

        Assert.True(FieldPeopleRules.HasModule(field, "owner-1", FamilyModules.Money));
        Assert.True(FieldPeopleRules.HasModule(field, "p1", FamilyModules.Tasks));
        Assert.False(FieldPeopleRules.HasModule(field, "p1", FamilyModules.Money));
        Assert.False(FieldPeopleRules.HasModule(field, "p1", FamilyModules.Photos));
        Assert.False(FieldPeopleRules.HasModule(field, "p1", FamilyModules.Chronologio));
    }

    [Fact]
    public void HasModule_MapsLegacyCalendarToChronologio()
    {
        var field = AdminField();
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Family, "f1",
            ["fields", "tasks", "calendar"], FamilyAccessLevels.View, "owner-1",
            status: FamilyMemberStatuses.Active);

        Assert.True(FieldPeopleRules.HasModule(field, "f1", FamilyModules.Chronologio));
        Assert.True(FieldPeopleRules.HasModule(field, "f1", FamilyModules.Calendar));
        Assert.Contains(FamilyModules.Chronologio, field.People.First(p => p.UserId == "f1").Modules);
        Assert.DoesNotContain("calendar", field.People.First(p => p.UserId == "f1").Modules);
    }

    [Fact]
    public void DefaultOnInvite_IncludesPhotosAndChronologio()
    {
        Assert.Contains(FamilyModules.Photos, FamilyModules.DefaultOnInvite);
        Assert.Contains(FamilyModules.Chronologio, FamilyModules.DefaultOnInvite);
        Assert.Contains(FamilyModules.Photos, FamilyModules.All);
    }

    [Fact]
    public void SyncDerivedIds_SetsOwnerIdFromAdmin()
    {
        var field = AdminField();
        field.OwnerId = "stale";
        FieldPeopleRules.SyncDerivedIds(field);
        Assert.Equal("owner-1", field.OwnerId);
    }

    [Fact]
    public void CannotRevokeAdmin()
    {
        var field = AdminField();
        var admin = FieldPeopleRules.GetAdmin(field)!;
        Assert.Throws<InvalidOperationException>(() => FieldPeopleRules.RevokeSeat(field, admin));
    }

    [Fact]
    public void AddOrReplaceSeat_PartnerIsActiveMember()
    {
        var field = AdminField();
        FieldPeopleRules.AddOrReplaceSeat(
            field, FieldPersonRole.Partner, "agro-1", FamilyModules.DefaultOnInvite, FamilyAccessLevels.Work, "owner-1",
            status: FamilyMemberStatuses.Active);

        Assert.True(FieldPeopleRules.IsMember(field, "agro-1"));
        Assert.False(FieldPeopleRules.IsAdmin(field, "agro-1"));
        Assert.Equal("owner-1", field.OwnerId);
    }

    private static Field AdminField()
    {
        var field = new Field
        {
            Id = "f1",
            Name = "Grove",
            OwnerId = "owner-1",
            CreatedAt = DateTime.UtcNow
        };
        FieldPeopleRules.EnsureNormalized(field);
        return field;
    }
}
