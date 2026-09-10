using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.FieldWork;

namespace OliveLifecycle.Application.Services;

public interface IFieldWorkAuthorizationService
{
    Task EnsureCanViewFieldWorkAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task EnsureCanManageProposalsAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task EnsureCanCreateOrEditTaskAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task EnsureCanOperateTaskAsync(FieldTask task, string userId, string userRole, CancellationToken cancellationToken = default);
    Task EnsureCanRecordPhenologyAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task EnsureCanEditWorkProfileAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
    Task EnsureFieldEligibleForProposalsAsync(string fieldId, CancellationToken cancellationToken = default);
    Task EnsureFieldEligibleForProfileActivationAsync(string fieldId, CancellationToken cancellationToken = default);
    Task<FieldWorkAccess> ResolveAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken = default);
}

public sealed class FieldWorkAccess
{
    public bool CanView { get; init; }
    public bool CanManageProposals { get; init; }
    public bool CanCreateTasks { get; init; }
    public bool CanOperateAssignedTasks { get; init; }
    public bool CanRecordPhenology { get; init; }
    /// <summary>Owner/manager may edit field-work personalisation. Service providers cannot by default.</summary>
    public bool CanEditWorkProfile { get; init; }
    public bool IsOwner { get; init; }
    public bool IsAgronomist { get; init; }
    public bool IsAssignedWorker { get; init; }

    /// <summary>Assigned workers never receive financial capabilities from task assignment alone.</summary>
    public IReadOnlyList<string> FinancialCapabilities { get; init; } = [];

    public static FieldWorkAccess None { get; } = new();
}

public class FieldWorkAuthorizationService : IFieldWorkAuthorizationService
{
    private readonly IFieldRepository _fields;
    private readonly IFieldAccessService _fieldAccess;
    private readonly IFieldTaskRepository _fieldTasks;

    public FieldWorkAuthorizationService(
        IFieldRepository fields,
        IFieldAccessService fieldAccess,
        IFieldTaskRepository fieldTasks)
    {
        _fields = fields;
        _fieldAccess = fieldAccess;
        _fieldTasks = fieldTasks;
    }

    public async Task EnsureCanViewFieldWorkAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var access = await ResolveAsync(fieldId, userId, userRole, cancellationToken);
        if (!access.CanView)
        {
            throw new ForbiddenException("You do not have access to field work on this field.");
        }
    }

    public async Task EnsureCanManageProposalsAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var access = await ResolveAsync(fieldId, userId, userRole, cancellationToken);
        if (!access.CanManageProposals)
        {
            throw new ForbiddenException("You do not have permission to manage task proposals on this field.");
        }
    }

    public async Task EnsureCanCreateOrEditTaskAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var access = await ResolveAsync(fieldId, userId, userRole, cancellationToken);
        if (!access.CanCreateTasks)
        {
            throw new ForbiddenException("You do not have permission to create or edit field tasks.");
        }
    }

    public async Task EnsureCanOperateTaskAsync(
        FieldTask task,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var access = await ResolveAsync(task.FieldId, userId, userRole, cancellationToken);
        if (access.CanCreateTasks)
        {
            return;
        }

        if (access.CanOperateAssignedTasks
            && string.Equals(task.AssignedUserId, userId, StringComparison.Ordinal))
        {
            return;
        }

        throw new ForbiddenException("You do not have permission to operate this field task.");
    }

    public async Task EnsureCanRecordPhenologyAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var access = await ResolveAsync(fieldId, userId, userRole, cancellationToken);
        if (!access.CanRecordPhenology)
        {
            throw new ForbiddenException("You do not have permission to record phenology on this field.");
        }
    }

    public async Task EnsureCanEditWorkProfileAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (userRole == Roles.ServiceProvider)
        {
            throw new ForbiddenException("Service providers cannot change field-work preferences by default.");
        }

        var access = await ResolveAsync(fieldId, userId, userRole, cancellationToken);
        if (!access.CanEditWorkProfile)
        {
            throw new ForbiddenException("You do not have permission to edit the field-work profile.");
        }
    }

    public async Task EnsureFieldEligibleForProposalsAsync(
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (!ProposalEligibility.IsEligible(field.Status, out var reason))
        {
            throw new ValidationException(reason ?? "Field is not eligible for proposals.");
        }
    }

    public async Task EnsureFieldEligibleForProfileActivationAsync(
        string fieldId,
        CancellationToken cancellationToken = default)
    {
        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (field.Status == FieldStatus.Draft)
        {
            throw new ValidationException("Draft fields cannot activate a field-work profile.");
        }

        if (field.Status == FieldStatus.Archived)
        {
            throw new ValidationException("Archived fields cannot activate a field-work profile.");
        }
    }

    public async Task<FieldWorkAccess> ResolveAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var field = await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (userRole == Roles.Administrator)
        {
            return OwnerAccess();
        }

        var isOwner = field.OwnerId == userId
            || await _fieldAccess.CanUserModifyFieldAsync(fieldId, userId, cancellationToken)
            || FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Own);

        if (isOwner)
        {
            return OwnerAccess();
        }

        var familyCanCreate = await _fieldAccess.CanFamilyWriteModuleAsync(
            fieldId, userId, FamilyModules.Tasks, requireCreateLevel: true, cancellationToken);
        if (familyCanCreate)
        {
            return OwnerAccess();
        }

        var hasAdvise = FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Advise)
            || userRole == Roles.Agronomist;
        if (hasAdvise)
        {
            return new FieldWorkAccess
            {
                CanView = true,
                CanManageProposals = false,
                CanCreateTasks = false,
                CanOperateAssignedTasks = false,
                CanRecordPhenology = true,
                CanEditWorkProfile = false,
                IsOwner = false,
                IsAgronomist = true,
                FinancialCapabilities = []
            };
        }

        var familyCanView = await _fieldAccess.CanFamilyAccessModuleAsync(
            fieldId, userId, FamilyModules.Tasks, cancellationToken);
        var hasWork = FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Work)
            || FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Help)
            || FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.View);

        var assignedTasks = await _fieldTasks.QueryAsync(
            new FieldTaskQuery { FieldId = fieldId, AssignedUserId = userId },
            cancellationToken);
        var isAssigned = assignedTasks.Count > 0;

        if (familyCanView || hasWork || isAssigned
            || await _fieldAccess.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            return new FieldWorkAccess
            {
                CanView = true,
                CanManageProposals = false,
                CanCreateTasks = false,
                CanOperateAssignedTasks = isAssigned || hasWork,
                CanRecordPhenology = hasWork || familyCanView,
                CanEditWorkProfile = false,
                IsOwner = false,
                IsAssignedWorker = isAssigned,
                FinancialCapabilities = []
            };
        }

        return FieldWorkAccess.None;
    }

    private static FieldWorkAccess OwnerAccess() => new()
    {
        CanView = true,
        CanManageProposals = true,
        CanCreateTasks = true,
        CanOperateAssignedTasks = true,
        CanRecordPhenology = true,
        CanEditWorkProfile = true,
        IsOwner = true,
        FinancialCapabilities = FinancialCapabilities.OwnerAll
    };
}
