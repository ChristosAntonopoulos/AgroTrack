using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;

namespace OliveLifecycle.Application.Services;

public class FieldAccessService : IFieldAccessService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;

    public FieldAccessService(IFieldRepository fieldRepository, ITaskRepository taskRepository)
    {
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
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

        if (userRole == Roles.Producer)
        {
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
        return FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Own) || field.OwnerId == userId;
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
}
