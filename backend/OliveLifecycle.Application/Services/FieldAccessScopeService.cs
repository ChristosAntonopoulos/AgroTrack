using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Entities.FieldWork;

namespace OliveLifecycle.Application.Services;

public class FieldAccessScopeService : IFieldAccessScopeService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldTaskRepository _fieldTasks;

    public FieldAccessScopeService(
        IFieldRepository fieldRepository,
        IFieldTaskRepository fieldTasks)
    {
        _fieldRepository = fieldRepository;
        _fieldTasks = fieldTasks;
    }

    public async Task<IReadOnlyList<Field>> ResolveAccessibleFieldsAsync(
        string userId,
        string userRole,
        string? requiredModule = null,
        CancellationToken cancellationToken = default)
    {
        var fields = new List<Field>();
        fields.AddRange(await _fieldRepository.GetByMemberUserIdAsync(userId, cancellationToken));
        fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken));

        var taskFieldIds = new HashSet<string>(StringComparer.Ordinal);
        if (userRole == Roles.Producer)
        {
            var tasks = await _fieldTasks.QueryAsync(
                new FieldTaskQuery { AssignedUserId = userId },
                cancellationToken);
            foreach (var fieldId in tasks.Select(t => t.FieldId).Where(id => !string.IsNullOrWhiteSpace(id)))
            {
                taskFieldIds.Add(fieldId);
            }

            if (taskFieldIds.Count > 0)
            {
                fields.AddRange(await _fieldRepository.GetByIdsAsync(taskFieldIds, cancellationToken));
            }
        }

        var result = new List<Field>();
        foreach (var field in fields.DistinctBy(f => f.Id))
        {
            FieldPeopleRules.EnsureNormalized(field);

            var keepSeat =
                userRole == Roles.Administrator
                || FieldPeopleRules.IsActiveMember(field, userId)
                || string.Equals(field.OwnerId, userId, StringComparison.Ordinal)
                || taskFieldIds.Contains(field.Id);

            if (!keepSeat)
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(requiredModule))
            {
                var hasModule =
                    userRole == Roles.Administrator
                    || FieldPeopleRules.IsAdmin(field, userId)
                    || FieldPeopleRules.HasModule(field, userId, requiredModule);
                if (!hasModule)
                {
                    continue;
                }
            }

            result.Add(field);
        }

        return result;
    }

    public async Task<IReadOnlyList<string>> ResolveAccessibleFieldIdsAsync(
        string userId,
        string userRole,
        string? requiredModule = null,
        CancellationToken cancellationToken = default)
    {
        var fields = await ResolveAccessibleFieldsAsync(userId, userRole, requiredModule, cancellationToken);
        return fields.Select(f => f.Id).ToList();
    }
}
