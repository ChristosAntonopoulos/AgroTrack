using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Application.Services;

public class FieldAccessService : IFieldAccessService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly ISubscriptionService _subscriptionService;

    public FieldAccessService(IFieldRepository fieldRepository, ISubscriptionService subscriptionService)
    {
        _fieldRepository = fieldRepository;
        _subscriptionService = subscriptionService;
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

        return string.Equals(field.OwnerId, userId, StringComparison.Ordinal);
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
        if (!FieldPeopleRules.IsAdmin(field, userId))
        {
            return false;
        }

        return await IsFieldWritableUnderSubscriptionAsync(field, cancellationToken);
    }

    public async Task<bool> CanUserAdministerFieldAsync(
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

    public Task<bool> CanUserAccessFieldDocumentsAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default) =>
        CanUserAccessFieldModuleAsync(fieldId, userId, userRole, FamilyModules.Documents, cancellationToken);

    public Task<bool> CanUserAccessFieldPhotosAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default) =>
        CanUserAccessFieldModuleAsync(fieldId, userId, userRole, FamilyModules.Photos, cancellationToken);

    public async Task<bool> CanUserAccessFieldModuleAsync(
        string fieldId,
        string userId,
        string userRole,
        string module,
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

        return FieldPeopleRules.HasModule(field, userId, module);
    }

    public Task<bool> CanFamilyAccessModuleAsync(
        string fieldId,
        string userId,
        string module,
        CancellationToken cancellationToken = default) =>
        CanUserAccessFieldModuleAsync(fieldId, userId, string.Empty, module, cancellationToken);

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
        if (!await IsFieldWritableUnderSubscriptionAsync(field, cancellationToken))
        {
            return false;
        }

        return FieldPeopleRules.CanWriteModule(field, userId, module, requireCreateLevel);
    }

    /// <summary>Whether the billing owner's plan currently allows writes on this grove.</summary>
    public async Task<bool> IsFieldWritableUnderSubscriptionAsync(
        Field field,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(field.OwnerId))
        {
            return true;
        }

        return await _subscriptionService.IsOwnedFieldWritableAsync(field.OwnerId, field.Id, cancellationToken);
    }
}
