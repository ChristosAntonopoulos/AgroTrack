using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.Family;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;

namespace OliveLifecycle.Application.Services;

public class FieldAccessService : IFieldAccessService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IFamilyMemberRepository _familyMembers;

    public FieldAccessService(
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IFamilyMemberRepository familyMembers)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _familyMembers = familyMembers;
    }

    public async Task<bool> CanUserAccessFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return false;
        }

        if (userRole == Roles.Administrator)
        {
            return true;
        }

        FieldMembershipSync.EnsureBackfilled(field);
        if (FieldMembershipSync.IsMember(field, userId))
        {
            return true;
        }

        if (field.OwnerId == userId || field.AssignedProducerIds.Contains(userId))
        {
            return true;
        }

        var family = await GetFamilyAccessForOwnerAsync(field.OwnerId, userId, cancellationToken);
        if (family != null && HasModule(family, FamilyModules.Fields))
        {
            return true;
        }

        if (userRole == Roles.Producer)
        {
            // Task assignment for Producers grants field access. PartnerUserId must never
            // be treated as AssignedTo — contacting/hiring a partner does not grant field access.
            var tasks = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            return tasks.Any(t => t.FieldId == fieldId);
        }

        return false;
    }

    public async Task<bool> CanUserModifyFieldAsync(
        string fieldId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return false;
        }

        FieldMembershipSync.EnsureBackfilled(field);
        return FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Own) || field.OwnerId == userId;
    }

    public async Task<bool> CanUserAccessFieldDocumentsAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (userRole == Roles.Administrator)
        {
            return true;
        }

        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return false;
        }

        FieldMembershipSync.EnsureBackfilled(field);
        if (FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Own) || field.OwnerId == userId)
        {
            return true;
        }

        return await CanFamilyAccessModuleAsync(fieldId, userId, FamilyModules.Documents, cancellationToken);
    }

    public async Task<bool> HasCapacityAsync(
        string fieldId,
        string userId,
        string capacity,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return false;
        }

        return FieldMembershipSync.HasCapacity(field, userId, capacity);
    }

    public async Task<FamilyAccessSnapshot?> GetFamilyAccessForFieldAsync(
        string fieldId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return null;
        }

        return await GetFamilyAccessForOwnerAsync(field.OwnerId, userId, cancellationToken);
    }

    public async Task<bool> CanFamilyAccessModuleAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken = default)
    {
        var access = await GetFamilyAccessForFieldAsync(fieldId, userId, cancellationToken);
        return access != null && HasModule(access, module);
    }

    public async Task<bool> CanFamilyWriteModuleAsync(
        string fieldId,
        string userId,
        string module,
        bool requireCreateLevel = false,
        CancellationToken cancellationToken = default)
    {
        var access = await GetFamilyAccessForFieldAsync(fieldId, userId, cancellationToken);
        if (access == null || !HasModule(access, module))
        {
            return false;
        }

        return requireCreateLevel
            ? FamilyAccessLevels.CanCreateContent(access.AccessLevel)
            : FamilyAccessLevels.CanWrite(access.AccessLevel);
    }

    private async Task<FamilyAccessSnapshot?> GetFamilyAccessForOwnerAsync(
        string ownerUserId,
        string userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(ownerUserId) || string.IsNullOrWhiteSpace(userId))
        {
            return null;
        }

        var members = await _familyMembers.GetActiveByLinkedUserIdAllAsync(userId, cancellationToken);
        var match = members.FirstOrDefault(m =>
            string.Equals(m.OwnerUserId, ownerUserId, StringComparison.Ordinal));
        if (match == null)
        {
            return null;
        }

        return new FamilyAccessSnapshot(match.OwnerUserId, match.Id, match.Modules, match.AccessLevel);
    }

    private static bool HasModule(FamilyAccessSnapshot access, string module) =>
        access.Modules.Any(m => string.Equals(m, FamilyModules.Normalize(module), StringComparison.OrdinalIgnoreCase));
}
