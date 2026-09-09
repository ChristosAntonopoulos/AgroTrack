using System.Globalization;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.Application.Services;

public class FinancialEntryService : IFinancialEntryService
{
    private readonly IFinancialEntryRepository _financialEntryRepository;
    private readonly IFieldRepository _fieldRepository;
    private readonly ITaskRepository _taskRepository;
    private readonly IFieldAccessService _fieldAccessService;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ILogger<FinancialEntryService> _logger;

    public FinancialEntryService(
        IFinancialEntryRepository financialEntryRepository,
        IFieldRepository fieldRepository,
        ITaskRepository taskRepository,
        IFieldAccessService fieldAccessService,
        IActivityService activityService,
        IDateTimeProvider dateTimeProvider,
        ILogger<FinancialEntryService> logger)
    {
        _financialEntryRepository = financialEntryRepository;
        _fieldRepository = fieldRepository;
        _taskRepository = taskRepository;
        _fieldAccessService = fieldAccessService;
        _activityService = activityService;
        _dateTimeProvider = dateTimeProvider;
        _logger = logger;
    }

    public async Task<FinancialEntryDto> CreateAsync(
        CreateFinancialEntryDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        await EnsureFieldAccessAsync(dto.FieldId, userId, userRole, cancellationToken);
        await EnsureMoneyModuleAsync(dto.FieldId, userId, userRole, write: true, cancellationToken);

        var field = await _fieldRepository.GetByIdAsync(dto.FieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");

        if (!string.IsNullOrWhiteSpace(dto.TaskId))
        {
            var task = await _taskRepository.GetByIdAsync(dto.TaskId, cancellationToken)
                ?? throw new ValidationException("Task not found.");
            if (task.FieldId != dto.FieldId)
            {
                throw new ValidationException("Task does not belong to this field.");
            }
        }

        var now = _dateTimeProvider.UtcNow;
        var amount = ResolveAmount(dto.Amount, dto.Quantity, dto.UnitPrice);
        var category = FinancialCategoryExtensions.FromApiString(dto.Category);
        var bucket = FinancialCategoryBucketExtensions.FromApiString(dto.Bucket)
            ?? category?.ToBucket();
        var currency = NormalizeCurrency(dto.Currency);

        var entry = new FinancialEntry
        {
            FieldId = dto.FieldId,
            LifecycleYear = string.IsNullOrWhiteSpace(dto.LifecycleYear)
                ? field.CurrentLifecycleYear
                : dto.LifecycleYear.Trim(),
            TaskId = string.IsNullOrWhiteSpace(dto.TaskId) ? null : dto.TaskId,
            HarvestId = string.IsNullOrWhiteSpace(dto.HarvestId) ? null : dto.HarvestId,
            Kind = FinancialEntryKindExtensions.FromApiString(dto.Kind),
            Amount = amount,
            Currency = currency,
            Description = dto.Description.Trim(),
            Bucket = bucket,
            Category = category,
            Quantity = dto.Quantity,
            Unit = string.IsNullOrWhiteSpace(dto.Unit) ? null : dto.Unit.Trim(),
            UnitPrice = dto.UnitPrice,
            OccurredOn = dto.OccurredOn?.ToUniversalTime() ?? now,
            Status = FinancialEntryStatus.Posted,
            RecordedBy = userId,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        var created = await _financialEntryRepository.CreateAsync(entry, cancellationToken);
        await TryMirrorTaskCostAsync(created, cancellationToken);
        await RecordActivityAsync(created, userId, created.Kind == FinancialEntryKind.Income ? "income_logged" : "expense_logged", cancellationToken);

        _logger.LogInformation(
            "Financial entry {EntryId} posted on field {FieldId} by {UserId}",
            created.Id,
            created.FieldId,
            userId);

        return FinancialEntryMapper.ToDto(created);
    }

    public async Task<FinancialEntryDto?> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var entry = await _financialEntryRepository.GetByIdAsync(id, cancellationToken);
        if (entry == null)
        {
            return null;
        }

        await EnsureFieldAccessAsync(entry.FieldId, userId, userRole, cancellationToken);
        return FinancialEntryMapper.ToDto(entry);
    }

    public async Task<IEnumerable<FinancialEntryDto>> GetByFieldIdAsync(
        string fieldId,
        string userId,
        string userRole,
        bool includeVoided = false,
        CancellationToken cancellationToken = default)
    {
        await EnsureFieldAccessAsync(fieldId, userId, userRole, cancellationToken);
        await EnsureMoneyModuleAsync(fieldId, userId, userRole, write: false, cancellationToken);
        var entries = await _financialEntryRepository.GetByFieldIdAsync(fieldId, includeVoided, 200, cancellationToken);
        return entries.Select(FinancialEntryMapper.ToDto);
    }

    public async Task<FieldFinancialSummaryDto> GetFieldSummaryAsync(
        string fieldId,
        string userId,
        string userRole,
        string? lifecycleYear = null,
        CancellationToken cancellationToken = default)
    {
        await EnsureFieldAccessAsync(fieldId, userId, userRole, cancellationToken);
        await EnsureMoneyModuleAsync(fieldId, userId, userRole, write: false, cancellationToken);
        var entries = (await _financialEntryRepository.GetByFieldIdAsync(fieldId, includeVoided: false, 500, cancellationToken))
            .Where(e => e.Status == FinancialEntryStatus.Posted)
            .Where(e => string.IsNullOrWhiteSpace(lifecycleYear) || e.LifecycleYear == lifecycleYear)
            .ToList();

        return BuildSummary(fieldId, lifecycleYear, entries, _dateTimeProvider.UtcNow);
    }

    public async Task<FinancialOverviewDto> GetOverviewAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var fields = (await GetAccessibleFieldsAsync(userId, userRole, cancellationToken)).ToList();
        var fieldIds = fields.Select(f => f.Id).ToList();
        var entries = fieldIds.Count == 0
            ? new List<FinancialEntry>()
            : (await _financialEntryRepository.GetByFieldIdsAsync(fieldIds, cancellationToken))
                .Where(e => e.Status == FinancialEntryStatus.Posted)
                .ToList();

        var now = _dateTimeProvider.UtcNow;
        var weekStart = now.AddDays(-7);
        var expenses = entries.Where(e => e.Kind == FinancialEntryKind.Expense).ToList();
        var income = entries.Where(e => e.Kind == FinancialEntryKind.Income).ToList();
        var names = fields.ToDictionary(f => f.Id, f => f.Name);

        var topFields = expenses
            .Where(e => e.OccurredOn >= weekStart)
            .GroupBy(e => e.FieldId)
            .Select(g => new FieldWeekCostDto
            {
                FieldId = g.Key,
                FieldName = names.TryGetValue(g.Key, out var name) ? name : g.Key,
                ThisWeekExpenses = g.Sum(e => e.Amount)
            })
            .OrderByDescending(f => f.ThisWeekExpenses)
            .Take(3)
            .ToList();

        return new FinancialOverviewDto
        {
            Currency = entries.Select(e => e.Currency).FirstOrDefault() ?? "EUR",
            ThisWeekExpenses = expenses.Where(e => e.OccurredOn >= weekStart).Sum(e => e.Amount),
            TotalExpenses = expenses.Sum(e => e.Amount),
            TotalIncome = income.Sum(e => e.Amount),
            Net = income.Sum(e => e.Amount) - expenses.Sum(e => e.Amount),
            PostedCount = entries.Count,
            FieldCount = fields.Count,
            TopFields = topFields
        };
    }

    public async Task<FinancialEntryDto> UpdateAsync(
        string id,
        UpdateFinancialEntryDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var entry = await _financialEntryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Financial entry not found.");

        await EnsureFieldAccessAsync(entry.FieldId, userId, userRole, cancellationToken);
        EnsureCanEdit(entry, userId, userRole, await CanOwnFieldAsync(entry.FieldId, userId, userRole, cancellationToken));

        if (dto.Amount.HasValue || (dto.Quantity.HasValue && dto.UnitPrice.HasValue))
        {
            entry.Amount = ResolveAmount(dto.Amount ?? entry.Amount, dto.Quantity ?? entry.Quantity, dto.UnitPrice ?? entry.UnitPrice);
        }

        if (dto.Description != null)
        {
            entry.Description = dto.Description.Trim();
        }

        if (dto.Notes != null)
        {
            entry.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
        }

        if (dto.OccurredOn.HasValue)
        {
            entry.OccurredOn = dto.OccurredOn.Value.ToUniversalTime();
        }

        if (dto.Quantity.HasValue)
        {
            entry.Quantity = dto.Quantity;
        }

        if (dto.Unit != null)
        {
            entry.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? null : dto.Unit.Trim();
        }

        if (dto.UnitPrice.HasValue)
        {
            entry.UnitPrice = dto.UnitPrice;
        }

        if (dto.Category != null)
        {
            entry.Category = FinancialCategoryExtensions.FromApiString(dto.Category);
            entry.Bucket ??= entry.Category?.ToBucket();
        }

        if (dto.Bucket != null)
        {
            entry.Bucket = FinancialCategoryBucketExtensions.FromApiString(dto.Bucket);
        }

        var updated = await _financialEntryRepository.UpdateAsync(entry, cancellationToken);
        await TryMirrorTaskCostAsync(updated, cancellationToken);
        await RecordActivityAsync(updated, userId, "expense_updated", cancellationToken);
        return FinancialEntryMapper.ToDto(updated);
    }

    public async Task<FinancialEntryDto> VoidAsync(
        string id,
        VoidFinancialEntryDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var entry = await _financialEntryRepository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Financial entry not found.");

        await EnsureFieldAccessAsync(entry.FieldId, userId, userRole, cancellationToken);

        if (!await CanOwnFieldAsync(entry.FieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("Only a field owner can void a cost.");
        }

        if (entry.Status == FinancialEntryStatus.Voided)
        {
            throw new ValidationException("This cost has already been voided.");
        }

        var now = _dateTimeProvider.UtcNow;
        entry.Status = FinancialEntryStatus.Voided;
        entry.VoidReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        entry.VoidedAt = now;
        entry.VoidedBy = userId;

        var updated = await _financialEntryRepository.UpdateAsync(entry, cancellationToken);
        await RecordActivityAsync(updated, userId, "expense_voided", cancellationToken);
        return FinancialEntryMapper.ToDto(updated);
    }

    internal static FieldFinancialSummaryDto BuildSummary(
        string fieldId,
        string? lifecycleYear,
        IReadOnlyCollection<FinancialEntry> entries,
        DateTime utcNow)
    {
        var weekStart = utcNow.AddDays(-7);
        var expenses = entries.Where(e => e.Kind == FinancialEntryKind.Expense).ToList();
        var income = entries.Where(e => e.Kind == FinancialEntryKind.Income).ToList();
        var totalExpenses = expenses.Sum(e => e.Amount);
        var totalIncome = income.Sum(e => e.Amount);

        var byBucket = expenses
            .GroupBy(e => (e.Bucket ?? FinancialCategoryBucket.Other).ToApiString())
            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount));

        return new FieldFinancialSummaryDto
        {
            FieldId = fieldId,
            Currency = entries.Select(e => e.Currency).FirstOrDefault() ?? "EUR",
            LifecycleYear = lifecycleYear,
            TotalExpenses = totalExpenses,
            TotalIncome = totalIncome,
            Net = totalIncome - totalExpenses,
            PostedCount = entries.Count,
            ThisWeekExpenses = expenses.Where(e => e.OccurredOn >= weekStart).Sum(e => e.Amount),
            ExpensesByBucket = byBucket
        };
    }

    private async Task<IEnumerable<Field>> GetAccessibleFieldsAsync(
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var fields = new List<Field>();
        fields.AddRange(await _fieldRepository.GetByOwnerIdAsync(userId, cancellationToken));
        fields.AddRange(await _fieldRepository.GetByAssignedProducerIdAsync(userId, cancellationToken));
        fields.AddRange(await _fieldRepository.GetByMemberUserIdAsync(userId, cancellationToken));

        if (userRole == Roles.Producer)
        {
            var tasks = await _taskRepository.GetByAssignedToAsync(userId, cancellationToken);
            var fieldIds = tasks.Select(t => t.FieldId).Distinct().ToList();
            if (fieldIds.Count > 0)
            {
                fields.AddRange(await _fieldRepository.GetByIdsAsync(fieldIds, cancellationToken));
            }
        }

        return fields.DistinctBy(f => f.Id);
    }

    private async Task EnsureFieldAccessAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken)
    {
        if (!await _fieldAccessService.CanUserAccessFieldAsync(fieldId, userId, userRole, cancellationToken))
        {
            throw new ForbiddenException("You do not have access to this field.");
        }
    }

    private async Task EnsureMoneyModuleAsync(
        string fieldId,
        string userId,
        string userRole,
        bool write,
        CancellationToken cancellationToken)
    {
        if (userRole == Roles.Administrator
            || await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken))
        {
            return;
        }

        var family = await _fieldAccessService.GetFamilyAccessForFieldAsync(fieldId, userId, cancellationToken);
        if (family == null)
        {
            return;
        }

        if (!family.Modules.Any(m => string.Equals(m, FamilyModules.Money, StringComparison.OrdinalIgnoreCase)))
        {
            throw new ForbiddenException("You do not have access to money for this field.");
        }

        if (write && !FamilyAccessLevels.CanCreateContent(family.AccessLevel))
        {
            throw new ForbiddenException("You can only view money on this field.");
        }
    }

    private async Task<bool> CanOwnFieldAsync(string fieldId, string userId, string userRole, CancellationToken cancellationToken)
    {
        if (userRole == Roles.Administrator)
        {
            return true;
        }

        return await _fieldAccessService.CanUserModifyFieldAsync(fieldId, userId, cancellationToken);
    }

    private void EnsureCanEdit(FinancialEntry entry, string userId, string userRole, bool canOwn)
    {
        if (entry.Status == FinancialEntryStatus.Voided)
        {
            throw new ValidationException("Voided costs cannot be edited.");
        }

        if (canOwn || userRole == Roles.Administrator)
        {
            return;
        }

        if (entry.RecordedBy != userId)
        {
            throw new ForbiddenException("You can only edit costs you recorded.");
        }

        if (entry.CreatedAt.Date != _dateTimeProvider.UtcNow.Date)
        {
            throw new ForbiddenException("Producers can only edit a cost on the same day it was logged.");
        }
    }

    private static decimal ResolveAmount(decimal? amount, decimal? quantity, decimal? unitPrice)
    {
        if (quantity.HasValue && unitPrice.HasValue)
        {
            return decimal.Round(quantity.Value * unitPrice.Value, 2, MidpointRounding.AwayFromZero);
        }

        if (amount.HasValue && amount.Value > 0)
        {
            return decimal.Round(amount.Value, 2, MidpointRounding.AwayFromZero);
        }

        throw new ValidationException("Amount must be greater than zero.");
    }

    private static string NormalizeCurrency(string? currency)
    {
        var value = string.IsNullOrWhiteSpace(currency) ? "EUR" : currency.Trim().ToUpperInvariant();
        if (value.Length != 3)
        {
            throw new ValidationException("Currency must be a 3-letter code.");
        }

        return value;
    }

    private async Task TryMirrorTaskCostAsync(FinancialEntry entry, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(entry.TaskId) || entry.Kind != FinancialEntryKind.Expense || entry.Status != FinancialEntryStatus.Posted)
        {
            return;
        }

        var task = await _taskRepository.GetByIdAsync(entry.TaskId, cancellationToken);
        if (task == null)
        {
            return;
        }

        task.Cost = entry.Amount;
        await _taskRepository.UpdateAsync(task, cancellationToken);
    }

    private async Task RecordActivityAsync(
        FinancialEntry entry,
        string actorUserId,
        string type,
        CancellationToken cancellationToken)
    {
        var amountText = entry.Amount.ToString("0.##", CultureInfo.InvariantCulture);
        var verb = type switch
        {
            "income_logged" => "logged income",
            "expense_voided" => "voided a cost",
            "expense_updated" => "updated a cost",
            _ => "logged a cost"
        };

        await _activityService.RecordAsync(
            entry.FieldId,
            type,
            $"{verb} {amountText} {entry.Currency}: {entry.Description}",
            actorUserId,
            entry.TaskId,
            new Dictionary<string, string>
            {
                ["entryId"] = entry.Id,
                ["amount"] = amountText,
                ["currency"] = entry.Currency,
                ["kind"] = entry.Kind.ToApiString(),
                ["status"] = entry.Status.ToApiString()
            },
            cancellationToken);
    }
}
