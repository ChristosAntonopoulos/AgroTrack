using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Common.Constants;

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

        if (field.OwnerId == userId || userRole == Roles.Administrator)
        {
            return true;
        }

        if (field.AssignedProducerIds.Contains(userId))
        {
            return true;
        }

        if (userRole == Roles.Producer)
        {
            var tasks = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            return tasks.Any(t => t.FieldId == fieldId);
        }

        return userRole == Roles.Agronomist && field.OwnerId == userId;
    }

    public async Task<bool> CanUserModifyFieldAsync(
        string fieldId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        return field != null && field.OwnerId == userId;
    }
}
