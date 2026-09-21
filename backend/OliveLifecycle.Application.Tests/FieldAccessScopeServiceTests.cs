using Moq;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldAccessScopeServiceTests
{
    private readonly Mock<IFieldRepository> _fields = new();
    private readonly Mock<IFieldTaskRepository> _tasks = new();
    private readonly FieldAccessScopeService _service;

    public FieldAccessScopeServiceTests()
    {
        _tasks.Setup(r => r.QueryAsync(It.IsAny<FieldTaskQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FieldTask>());
        _service = new FieldAccessScopeService(_fields.Object, _tasks.Object);
    }

    [Fact]
    public async Task ResolveAccessibleFieldIds_PartnerAndAdminSeats_ModuleFiltersMoney()
    {
        var fieldA = new Field
        {
            Id = "field-a",
            Name = "Partner Grove",
            OwnerId = "owner-a",
            Status = FieldStatus.Active
        };
        FieldPeopleRules.AddOrReplaceSeat(
            fieldA,
            FieldPersonRole.Admin,
            "owner-a",
            FamilyModules.All,
            FamilyAccessLevels.Work,
            "owner-a",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            fieldA,
            FieldPersonRole.Partner,
            "user-1",
            [FamilyModules.Fields, FamilyModules.Tasks, FamilyModules.Calendar],
            FamilyAccessLevels.Work,
            "owner-a",
            status: FamilyMemberStatuses.Active);

        var fieldB = new Field
        {
            Id = "field-b",
            Name = "Admin Grove",
            OwnerId = "user-1",
            Status = FieldStatus.Active
        };
        FieldPeopleRules.AddOrReplaceSeat(
            fieldB,
            FieldPersonRole.Admin,
            "user-1",
            FamilyModules.All,
            FamilyAccessLevels.Work,
            "user-1",
            status: FamilyMemberStatuses.Active);

        _fields.Setup(r => r.GetByMemberUserIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { fieldA, fieldB });
        _fields.Setup(r => r.GetByOwnerIdAsync("user-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { fieldB });

        var all = await _service.ResolveAccessibleFieldIdsAsync("user-1", Roles.FieldOwner);
        Assert.Equal(2, all.Count);
        Assert.Contains("field-a", all);
        Assert.Contains("field-b", all);

        var moneyOnly = await _service.ResolveAccessibleFieldIdsAsync(
            "user-1", Roles.FieldOwner, FamilyModules.Money);
        Assert.Single(moneyOnly);
        Assert.Equal("field-b", moneyOnly[0]);
    }

    [Fact]
    public async Task ResolveAccessibleFieldIds_FamilyWithMoneyAndHarvest_IncludedForThoseModules()
    {
        var field = new Field
        {
            Id = "field-fam",
            Name = "Family Grove",
            OwnerId = "owner-1",
            Status = FieldStatus.Active
        };
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Admin,
            "owner-1",
            FamilyModules.All,
            FamilyAccessLevels.Work,
            "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Family,
            "family-1",
            [FamilyModules.Money, FamilyModules.Harvest, FamilyModules.Fields],
            FamilyAccessLevels.Help,
            "owner-1",
            status: FamilyMemberStatuses.Active);

        _fields.Setup(r => r.GetByMemberUserIdAsync("family-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { field });
        _fields.Setup(r => r.GetByOwnerIdAsync("family-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());

        var money = await _service.ResolveAccessibleFieldIdsAsync(
            "family-1", Roles.FieldOwner, FamilyModules.Money);
        var harvest = await _service.ResolveAccessibleFieldIdsAsync(
            "family-1", Roles.FieldOwner, FamilyModules.Harvest);
        var tasks = await _service.ResolveAccessibleFieldIdsAsync(
            "family-1", Roles.FieldOwner, FamilyModules.Tasks);

        Assert.Equal(new[] { "field-fam" }, money);
        Assert.Equal(new[] { "field-fam" }, harvest);
        Assert.Empty(tasks);
    }

    [Fact]
    public async Task ResolveAccessibleFieldIds_RevokedOrInactiveSeat_NotReturned()
    {
        var revoked = new Field
        {
            Id = "field-revoked",
            Name = "Revoked",
            OwnerId = "owner-1",
            Status = FieldStatus.Active
        };
        FieldPeopleRules.AddOrReplaceSeat(
            revoked,
            FieldPersonRole.Admin,
            "owner-1",
            FamilyModules.All,
            FamilyAccessLevels.Work,
            "owner-1",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            revoked,
            FieldPersonRole.Partner,
            "user-x",
            FamilyModules.DefaultOnInvite,
            FamilyAccessLevels.Work,
            "owner-1",
            status: FamilyMemberStatuses.Revoked);

        var pending = new Field
        {
            Id = "field-pending",
            Name = "Pending",
            OwnerId = "owner-2",
            Status = FieldStatus.Active
        };
        FieldPeopleRules.AddOrReplaceSeat(
            pending,
            FieldPersonRole.Admin,
            "owner-2",
            FamilyModules.All,
            FamilyAccessLevels.Work,
            "owner-2",
            status: FamilyMemberStatuses.Active);
        FieldPeopleRules.AddOrReplaceSeat(
            pending,
            FieldPersonRole.Family,
            "user-x",
            FamilyModules.DefaultOnInvite,
            FamilyAccessLevels.View,
            "owner-2",
            status: FamilyMemberStatuses.Pending);

        _fields.Setup(r => r.GetByMemberUserIdAsync("user-x", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { revoked, pending });
        _fields.Setup(r => r.GetByOwnerIdAsync("user-x", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<Field>());

        var ids = await _service.ResolveAccessibleFieldIdsAsync("user-x", Roles.Producer);

        Assert.Empty(ids);
    }
}
