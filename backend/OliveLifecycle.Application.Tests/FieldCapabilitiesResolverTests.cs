using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldCapabilitiesResolverTests
{
    [Fact]
    public void AdminGetsAllImplementedCapabilitiesExceptDocumentsAndArchive()
    {
        var field = BuildField("admin");

        var capabilities = FieldCapabilitiesResolver.Resolve(field, "admin");

        Assert.True(capabilities.CanViewSensitiveIdentity);
        Assert.True(capabilities.CanManageAccess);
        Assert.True(capabilities.CanDeleteField);
        Assert.False(capabilities.CanViewDocuments);
        Assert.False(capabilities.CanManageDocuments);
        Assert.False(capabilities.CanArchiveField);
    }

    [Fact]
    public void CollaboratorCapabilitiesFollowModulesAndAccessLevel()
    {
        var field = BuildField("admin");
        FieldPeopleRules.AddOrReplaceSeat(
            field,
            FieldPersonRole.Partner,
            "partner",
            [FamilyModules.Fields, FamilyModules.Tasks, FamilyModules.Money],
            FamilyAccessLevels.Help,
            "admin",
            status: FamilyMemberStatuses.Active);

        var capabilities = FieldCapabilitiesResolver.Resolve(field, "partner");

        Assert.True(capabilities.CanViewField);
        Assert.True(capabilities.CanViewTasks);
        Assert.True(capabilities.CanManageTasks);
        Assert.True(capabilities.CanViewMoney);
        Assert.False(capabilities.CanCreateRecords);
        Assert.False(capabilities.CanViewPhotos);
        Assert.False(capabilities.CanViewSensitiveIdentity);
        Assert.False(capabilities.CanEditField);
    }

    private static Field BuildField(string ownerId)
    {
        var field = new Field { OwnerId = ownerId, Name = "Test" };
        field.People.Add(FieldPeopleRules.CreateAdminSeat(ownerId));
        return field;
    }
}
