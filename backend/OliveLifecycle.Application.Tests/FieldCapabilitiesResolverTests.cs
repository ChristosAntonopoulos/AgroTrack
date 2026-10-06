using OliveLifecycle.Application.Services;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using Xunit;

namespace OliveLifecycle.Application.Tests;

public class FieldCapabilitiesResolverTests
{
    [Fact]
    public void AdminGetsArchiveWhenActive_AndNotPermanentlyDeleteUntilEnriched()
    {
        var field = BuildField("admin");
        field.Status = FieldStatus.Active;

        var capabilities = FieldCapabilitiesResolver.Resolve(field, "admin");

        Assert.True(capabilities.CanViewSensitiveIdentity);
        Assert.True(capabilities.CanManageAccess);
        Assert.True(capabilities.CanDeleteField);
        Assert.True(capabilities.CanArchiveField);
        Assert.False(capabilities.CanRestoreField);
        Assert.False(capabilities.CanPermanentlyDelete);
        Assert.False(capabilities.CanViewDocuments);
        Assert.False(capabilities.CanManageDocuments);
    }

    [Fact]
    public void AdminOnArchivedField_CanRestore_NotArchive_NotCreate()
    {
        var field = BuildField("admin");
        field.Status = FieldStatus.Archived;

        var capabilities = FieldCapabilitiesResolver.Resolve(field, "admin");

        Assert.False(capabilities.CanArchiveField);
        Assert.True(capabilities.CanRestoreField);
        Assert.False(capabilities.CanCreateRecords);
        Assert.False(capabilities.CanEditField);
        Assert.True(capabilities.CanViewChronologio);
        Assert.True(capabilities.CanDeleteField);
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
        Assert.False(capabilities.CanArchiveField);
    }

    private static Field BuildField(string ownerId)
    {
        var field = new Field { OwnerId = ownerId, Name = "Test" };
        field.People.Add(FieldPeopleRules.CreateAdminSeat(ownerId));
        return field;
    }
}
