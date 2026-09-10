using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class FinancialAuthorizationService : IFinancialAuthorizationService
{
    private readonly IFieldRepository _fieldRepository;
    private readonly IFieldAccessService _fieldAccessService;

    public FinancialAuthorizationService(
        IFieldRepository fieldRepository,
        IFieldAccessService fieldAccessService)
    {
        _fieldRepository = fieldRepository;
        _fieldAccessService = fieldAccessService;
    }

    public async Task<FinancialAccess> ResolveForFieldAsync(
        string fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var field = await _fieldRepository.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }

        return await BuildAccessAsync(field, userId, userRole, cancellationToken);
    }

    public async Task<FinancialAccess> ResolveForUnassignedAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (userRole == Roles.Administrator)
        {
            return OwnerAccess();
        }

        if (IsProfessionalRole(userRole))
        {
            return FinancialAccess.None;
        }

        var owned = (await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken)).ToList();
        if (owned.Count == 0)
        {
            return FinancialAccess.None;
        }

        return OwnerAccess();
    }

    public async Task<FinancialAccess> ResolveForTransactionAsync(
        FinancialTransaction transaction,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(transaction.FieldId))
        {
            var unassigned = await ResolveForUnassignedAsync(userId, userRole, cancellationToken);
            if (transaction.OwnerUserId == userId || userRole == Roles.Administrator)
            {
                return unassigned;
            }

            return FinancialAccess.None;
        }

        return await ResolveForFieldAsync(transaction.FieldId, userId, userRole, cancellationToken);
    }

    public bool CanViewTransaction(FinancialAccess access, FinancialTransaction transaction, string userId)
    {
        if (access.IsProfessional && !access.IsOwner)
        {
            return false;
        }

        if (access.IsOwner || access.Can(FinancialCapabilities.ViewTransactions))
        {
            if (transaction.Type == FinancialTransactionType.Income && !access.Can(FinancialCapabilities.ViewIncome))
            {
                return false;
            }

            return true;
        }

        if (access.OwnExpensesOnly)
        {
            return transaction.Type == FinancialTransactionType.Expense
                && transaction.CreatedByUserId == userId;
        }

        return false;
    }

    private async Task<FinancialAccess> BuildAccessAsync(
        Field field,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (userRole == Roles.Administrator || field.OwnerId == userId
            || await _fieldAccessService.CanUserModifyFieldAsync(field.Id, userId, cancellationToken))
        {
            return OwnerAccess();
        }

        if (IsProfessionalRole(userRole) || FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Advise))
        {
            return FinancialAccess.None;
        }

        var family = await _fieldAccessService.GetFamilyAccessForFieldAsync(field.Id, userId, cancellationToken);
        if (family != null)
        {
            var hasMoney = family.Modules.Any(m =>
                string.Equals(m, FamilyModules.Money, StringComparison.OrdinalIgnoreCase));
            if (!hasMoney || !FamilyAccessLevels.CanCreateContent(family.AccessLevel))
            {
                return FinancialAccess.None;
            }

            return CollaboratorAccess();
        }

        if (FieldMembershipSync.HasCapacity(field, userId, FieldCapacities.Work)
            || field.AssignedProducerIds.Contains(userId))
        {
            return CollaboratorAccess();
        }

        return FinancialAccess.None;
    }

    private static FinancialAccess OwnerAccess() => new()
    {
        IsOwner = true,
        Capabilities = FinancialCapabilities.OwnerAll.ToHashSet()
    };

    private static FinancialAccess CollaboratorAccess() => new()
    {
        OwnExpensesOnly = true,
        Capabilities = FinancialCapabilities.CollaboratorExpenseOnly.ToHashSet()
    };

    private static bool IsProfessionalRole(string userRole) =>
        userRole is Roles.Agronomist or Roles.ServiceProvider;
}
