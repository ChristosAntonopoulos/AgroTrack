using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.OilStock;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class OilCellarRulesTests
{
    private static Field Grove(string ownerId, params (string userId, FieldPersonRole role)[] seats)
    {
        var field = new Field
        {
            Id = "field-1",
            OwnerId = ownerId,
            Name = "Κτήμα",
            People = seats
                .Select(s => new FieldPerson
                {
                    UserId = s.userId,
                    Role = s.role,
                    Status = FamilyMemberStatuses.Active,
                    AccessLevel = FamilyAccessLevels.Work,
                    Modules = FamilyModules.All.ToList(),
                    CreatedAt = DateTime.UtcNow
                })
                .ToList()
        };
        FieldPeopleRules.EnsureNormalized(field);
        return field;
    }

    [Fact]
    public void Admin_and_Family_are_eligible_Partner_is_not()
    {
        var field = Grove(
            "owner-1",
            ("owner-1", FieldPersonRole.Admin),
            ("family-1", FieldPersonRole.Family),
            ("partner-1", FieldPersonRole.Partner));

        Assert.True(OilCellarRules.IsEligibleCellarOwner(field, "owner-1"));
        Assert.True(OilCellarRules.IsEligibleCellarOwner(field, "family-1"));
        Assert.False(OilCellarRules.IsEligibleCellarOwner(field, "partner-1"));
    }

    [Fact]
    public void Only_admin_can_assign_to_someone_else()
    {
        var field = Grove(
            "owner-1",
            ("owner-1", FieldPersonRole.Admin),
            ("family-1", FieldPersonRole.Family));

        Assert.True(OilCellarRules.CanAssignCellar(field, "owner-1"));
        Assert.False(OilCellarRules.CanAssignCellar(field, "family-1"));
    }

    [Fact]
    public void Eligible_people_lists_admin_and_family_once()
    {
        var field = Grove(
            "owner-1",
            ("owner-1", FieldPersonRole.Admin),
            ("family-1", FieldPersonRole.Family),
            ("partner-1", FieldPersonRole.Partner));

        var people = OilCellarRules.EligibleCellarPeople([field]);
        Assert.Equal(2, people.Count);
        Assert.Contains(people, p => p.UserId == "owner-1");
        Assert.Contains(people, p => p.UserId == "family-1");
    }
}
