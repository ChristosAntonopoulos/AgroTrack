using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Services;

public class FieldAccessService : IFieldAccessService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldTaskRepository _fieldTasks;

    public FieldAccessService(
        IFieldRepository fieldRepository,
        IFieldTaskRepository fieldTasks)
    {
        _fieldRepository = fieldRepository;
        _fieldTasks = fieldTasks;
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

        FieldPeopleRules.EnsureNormalized(field);
        if (FieldPeopleRules.IsActiveMember(field, userId))
        {
            return true;
        }

        if (string.Equals(field.OwnerId, userId, StringComparison.Ordinal))
        {
            return true;
        }

        if (userRole == Roles.Producer)
        {
            var tasks = await _fieldTasks.QueryAsync(
                new FieldTaskQuery { AssignedUserId = userId },
                cancellationToken) ?? Array.Empty<FieldTask>();
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

        FieldPeopleRules.EnsureNormalized(field);
        return FieldPeopleRules.IsAdmin(field, userId);
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

        FieldPeopleRules.EnsureNormalized(field);
        if (FieldPeopleRules.IsAdmin(field, userId))
        {
            return true;
        }

        return FieldPeopleRules.HasModule(field, userId, FamilyModules.Documents);
    }

    public async Task<bool> CanFamilyAccessModuleAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return false;
        }

        FieldPeopleRules.EnsureNormalized(field);
        if (FieldPeopleRules.IsAdmin(field, userId))
        {
            return true;
        }

        return FieldPeopleRules.HasModule(field, userId, module);
    }

    public async Task<bool> CanFamilyWriteModuleAsync(
        string fieldId,
        string userId,
        string module,
        bool requireCreateLevel = false,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken);
        if (field == null)
        {
            return false;
        }

        FieldPeopleRules.EnsureNormalized(field);
        return FieldPeopleRules.CanWriteModule(field, userId, module, requireCreateLevel);
    }
}
