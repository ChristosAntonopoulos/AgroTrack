using OliveLifecycle.Application.DTOs.Field;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services;

public static class FieldCapabilitiesResolver
{
    public static FieldCapabilitiesDto Resolve(Field field, string userId, string? userRole = null)
    {
        FieldPeopleRules.EnsureNormalized(field);
        var seat = FieldPeopleRules.GetActiveByUserId(field, userId);
        var isAdmin = string.Equals(userRole, Roles.Administrator, StringComparison.Ordinal)
            || FieldPeopleRules.IsAdmin(field, userId);
        var hasFieldAccess = isAdmin || seat != null;
        var isArchived = field.Status == FieldStatus.Archived;
        var canArchive = isAdmin && !isArchived && field.Status != FieldStatus.Draft;
        var canRestore = isAdmin && isArchived;

        if (isAdmin)
        {
            return new FieldCapabilitiesDto
            {
                CanViewField = true,
                CanViewBoundary = true,
                CanViewSensitiveIdentity = true,
                CanViewEnvironmentalData = true,
                CanViewChronologio = true,
                CanCreateRecords = !isArchived,
                CanViewTasks = true,
                CanManageTasks = !isArchived,
                CanViewPhotos = true,
                CanUploadPhotos = !isArchived,
                CanViewMoney = true,
                CanViewHarvest = true,
                // Documents remain intentionally hidden for the alpha cycle.
                CanViewDocuments = false,
                CanManageDocuments = false,
                CanManageAccess = !isArchived,
                CanEditField = !isArchived,
                CanArchiveField = canArchive,
                CanRestoreField = canRestore,
                CanPermanentlyDelete = false,
                CanDeleteField = true
            };
        }

        var canCreate = !isArchived && seat != null && FamilyAccessLevels.CanCreateContent(seat.AccessLevel);
        var canWrite = !isArchived && seat != null && FamilyAccessLevels.CanWrite(seat.AccessLevel);
        var hasTasks = hasFieldAccess && HasModule(seat, FamilyModules.Tasks);
        var hasPhotos = hasFieldAccess && HasModule(seat, FamilyModules.Photos);

        return new FieldCapabilitiesDto
        {
            CanViewField = hasFieldAccess,
            CanViewBoundary = hasFieldAccess,
            CanViewSensitiveIdentity = false,
            CanViewEnvironmentalData = hasFieldAccess,
            CanViewChronologio = hasFieldAccess && HasModule(seat, FamilyModules.Chronologio),
            CanCreateRecords = canCreate,
            CanViewTasks = hasTasks,
            CanManageTasks = hasTasks && canWrite,
            CanViewPhotos = hasPhotos,
            CanUploadPhotos = hasPhotos && canCreate,
            CanViewMoney = hasFieldAccess && HasModule(seat, FamilyModules.Money),
            CanViewHarvest = hasFieldAccess && HasModule(seat, FamilyModules.Harvest),
            CanViewDocuments = false,
            CanManageDocuments = false,
            CanManageAccess = false,
            CanEditField = false,
            CanArchiveField = false,
            CanRestoreField = false,
            CanPermanentlyDelete = false,
            CanDeleteField = false
        };
    }

    private static bool HasModule(FieldPerson? seat, string module) =>
        seat?.Modules.Any(value =>
            string.Equals(FamilyModules.Normalize(value), module, StringComparison.OrdinalIgnoreCase)) == true;
}
