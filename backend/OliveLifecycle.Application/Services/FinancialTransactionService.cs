using System.Globalization;
using Microsoft.Extensions.Logging;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Application.Mappings;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Finance;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Services;

public class FinancialTransactionService : IFinancialTransactionService
{
    private readonly IFinancialTransactionRepository _transactions;
    private readonly IFieldRepository _fields;
    private readonly IFieldTaskRepository _fieldTasks;
    private readonly IHarvestRecordRepository _harvests;
    private readonly IFinancialAuthorizationService _authorization;
    private readonly IActivityService _activityService;
    private readonly IDateTimeProvider _clock;
    private readonly ILogger<FinancialTransactionService> _logger;

    public FinancialTransactionService(
        IFinancialTransactionRepository transactions,
        IFieldRepository fields,
        IFieldTaskRepository fieldTasks,
        IHarvestRecordRepository harvests,
        IFinancialAuthorizationService authorization,
        IActivityService activityService,
        IDateTimeProvider clock,
        ILogger<FinancialTransactionService> logger)
    {
        _transactions = transactions;
        _fields = fields;
        _fieldTasks = fieldTasks;
        _harvests = harvests;
        _authorization = authorization;
        _activityService = activityService;
        _clock = clock;
        _logger = logger;
    }

    public async Task<FinancialTransactionDto> CreateAsync(
        CreateFinancialTransactionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var type = FinancialTransactionTypeExtensions.FromApiString(dto.Type)
            ?? throw new ValidationException("Type must be income or expense.");
        var status = dto.SaveAsDraft ? FinancialTransactionStatus.Draft : FinancialTransactionStatus.Posted;
        var field = await ResolveFieldAsync(dto.FieldId, cancellationToken);
        var ownerUserId = field?.OwnerId ?? userId;
        var access = await ResolveAccessAsync(dto.FieldId, userId, userRole, cancellationToken);
        EnsureCanCreate(access, type);

        var idempotencyKey = NormalizeIdempotencyKey(dto.IdempotencyKey);
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var existing = await _transactions.GetByIdempotencyKeyAsync(ownerUserId, idempotencyKey, cancellationToken);
            if (existing != null)
            {
                if (!CanView(access, existing, userId))
                {
                    throw new ForbiddenException("You do not have access to this transaction.");
                }

                return FinancialTransactionMapper.ToDto(existing);
            }
        }

        await EnsureRelationshipsAsync(field, dto.RelatedTaskId, dto.RelatedHarvestId, cancellationToken);

        var now = _clock.UtcNow;
        var occurredOn = NormalizeOccurredOn(dto.OccurredOn, now);
        var resultYear = dto.ResultYear ?? AthensTime.CalendarYear(occurredOn);
        EnsureResultYear(resultYear, now);

        var category = FinancialTransactionCategoryExtensions.FromApiString(dto.Category);
        var quantity = ResolveQuantityFromCreate(dto, category);
        if (status == FinancialTransactionStatus.Posted)
        {
            EnsurePostedRequirements(quantity.Amount, occurredOn, resultYear, category, dto.Description, type);
        }
        else
        {
            EnsureAmount(quantity.Amount);
            EnsureCategoryMatchesType(category, type);
        }

        var transaction = new FinancialTransaction
        {
            OwnerUserId = ownerUserId,
            Type = type,
            Status = status,
            Amount = quantity.Amount,
            Currency = "EUR",
            OccurredOn = occurredOn,
            ResultYear = resultYear,
            FieldId = field?.Id,
            Category = category,
            ProductKind = FinancialProductKindExtensions.FromApiString(dto.ProductKind)
                ?? FinancialProductKindExtensions.FromCategory(category),
            Quantity = quantity.Quantity,
            QuantityUnit = quantity.QuantityUnit,
            UnitPrice = quantity.UnitPrice,
            CalculationMode = quantity.Mode,
            Description = dto.Description?.Trim() ?? string.Empty,
            PaymentMethod = NullIfEmpty(dto.PaymentMethod),
            CounterpartyName = NullIfEmpty(dto.CounterpartyName),
            RelatedTaskId = NullIfEmpty(dto.RelatedTaskId),
            RelatedHarvestId = NullIfEmpty(dto.RelatedHarvestId),
            RelatedCollaboratorId = NullIfEmpty(dto.RelatedCollaboratorId),
            SourceType = ResolveSourceType(dto.SourceType, dto.RelatedTaskId, dto.RelatedHarvestId),
            SourceId = NullIfEmpty(dto.SourceId) ?? NullIfEmpty(dto.RelatedTaskId) ?? NullIfEmpty(dto.RelatedHarvestId),
            AttachmentIds = dto.AttachmentIds?.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList() ?? [],
            Notes = NullIfEmpty(dto.Notes),
            IdempotencyKey = string.IsNullOrEmpty(idempotencyKey) ? Guid.NewGuid().ToString("N") : idempotencyKey,
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now,
            PostedAt = status == FinancialTransactionStatus.Posted ? now : null
        };

        var created = await _transactions.CreateAsync(transaction, cancellationToken);
        await RecordAuditAsync(created, userId, status == FinancialTransactionStatus.Posted ? "financial_posted" : "financial_created", cancellationToken);

        _logger.LogInformation(
            "Financial transaction {TransactionId} {Status} by {UserId} for owner {OwnerUserId}",
            created.Id,
            created.Status,
            userId,
            created.OwnerUserId);

        return FinancialTransactionMapper.ToDto(created);
    }

    public async Task<FinancialTransactionDto?> GetByIdAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var transaction = await _transactions.GetByIdAsync(id, cancellationToken);
        if (transaction == null)
        {
            return null;
        }

        var access = await _authorization.ResolveForTransactionAsync(transaction, userId, userRole, cancellationToken);
        if (!CanView(access, transaction, userId))
        {
            throw new ForbiddenException("You do not have access to this transaction.");
        }

        return FinancialTransactionMapper.ToDto(transaction);
    }

    public async Task<FinancialTransactionListDto> ListAsync(
        FinancialTransactionListQuery query,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 200 ? 50 : query.PageSize;
        var type = FinancialTransactionTypeExtensions.FromApiString(query.Type);
        var status = FinancialTransactionStatusExtensions.FromApiString(query.Status);
        var category = FinancialTransactionCategoryExtensions.FromApiString(query.Category);

        if (!string.IsNullOrWhiteSpace(query.FieldId))
        {
            var access = await _authorization.ResolveForFieldAsync(query.FieldId, userId, userRole, cancellationToken);
            if (access.IsProfessional && !access.IsOwner)
            {
                throw new ForbiddenException("You do not have access to money for this field.");
            }

            var pageResult = await _transactions.QueryAsync(new FinancialTransactionQuery
            {
                FieldId = query.FieldId,
                ResultYear = query.ResultYear,
                Type = type,
                Status = status,
                Category = category,
                Month = query.Month,
                RelatedTaskId = query.RelatedTaskId,
                RelatedHarvestId = query.RelatedHarvestId,
                CreatedByUserId = access.OwnExpensesOnly ? userId : null,
                Page = page,
                PageSize = pageSize
            }, cancellationToken);

            var visible = pageResult.Items.Where(t => CanView(access, t, userId)).ToList();
            if (access.OwnExpensesOnly)
            {
                visible = visible.Where(t => t.Type == FinancialTransactionType.Expense && t.CreatedByUserId == userId).ToList();
            }

            return new FinancialTransactionListDto
            {
                Items = visible.Select(t => FinancialTransactionMapper.ToDto(t)).ToList(),
                TotalCount = access.OwnExpensesOnly ? visible.Count : pageResult.TotalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        var owned = (await _fields.GetByOwnerIdAsync(userId, cancellationToken)).ToList();
        var unassignedAccess = await _authorization.ResolveForUnassignedAsync(userId, userRole, cancellationToken);
        if (unassignedAccess.IsProfessional && !unassignedAccess.IsOwner && owned.Count == 0)
        {
            throw new ForbiddenException("You do not have access to financial data.");
        }

        var fieldIds = owned.Select(f => f.Id).ToList();
        var pageFarm = await _transactions.QueryAsync(new FinancialTransactionQuery
        {
            OwnerUserId = userId,
            FieldIds = fieldIds,
            IncludeUnassigned = unassignedAccess.IsOwner,
            ResultYear = query.ResultYear,
            Type = type,
            Status = status,
            Category = category,
            Month = query.Month,
            RelatedTaskId = query.RelatedTaskId,
            RelatedHarvestId = query.RelatedHarvestId,
            Page = page,
            PageSize = pageSize
        }, cancellationToken);

        var farmVisible = pageFarm.Items.Where(t => CanView(unassignedAccess.IsOwner ? unassignedAccess : FinancialAccess.None, t, userId)).ToList();
        if (unassignedAccess.IsOwner)
        {
            farmVisible = pageFarm.Items.ToList();
        }

        return new FinancialTransactionListDto
        {
            Items = farmVisible.Select(t => FinancialTransactionMapper.ToDto(t)).ToList(),
            TotalCount = pageFarm.TotalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<FinancialTransactionDto> UpdateAsync(
        string id,
        UpdateFinancialTransactionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var transaction = await LoadAsync(id, cancellationToken);
        var access = await _authorization.ResolveForTransactionAsync(transaction, userId, userRole, cancellationToken);
        EnsureCanEdit(access, transaction, userId);

        var previousTask = transaction.RelatedTaskId;
        var previousHarvest = transaction.RelatedHarvestId;
        var previousAttachments = transaction.AttachmentIds.ToList();

        if (dto.OccurredOn.HasValue)
        {
            transaction.OccurredOn = NormalizeOccurredOn(dto.OccurredOn, _clock.UtcNow);
            if (!dto.ResultYear.HasValue)
            {
                transaction.ResultYear = AthensTime.CalendarYear(transaction.OccurredOn);
            }
        }

        if (dto.ResultYear.HasValue)
        {
            EnsureResultYear(dto.ResultYear.Value, _clock.UtcNow);
            transaction.ResultYear = dto.ResultYear.Value;
        }

        if (dto.ClearField)
        {
            transaction.FieldId = null;
            transaction.OwnerUserId = userId;
        }
        else if (!string.IsNullOrWhiteSpace(dto.FieldId))
        {
            var field = await ResolveFieldAsync(dto.FieldId, cancellationToken)
                ?? throw new ValidationException("Field not found.");
            var fieldAccess = await _authorization.ResolveForFieldAsync(field.Id, userId, userRole, cancellationToken);
            EnsureCanCreate(fieldAccess, transaction.Type);
            transaction.FieldId = field.Id;
            transaction.OwnerUserId = field.OwnerId;
        }

        if (dto.Category != null)
        {
            var category = FinancialTransactionCategoryExtensions.FromApiString(dto.Category)
                ?? throw new ValidationException("Unknown category.");
            EnsureCategoryMatchesType(category, transaction.Type);
            transaction.Category = category;
        }

        if (dto.Description != null)
        {
            transaction.Description = dto.Description.Trim();
        }

        if (dto.PaymentMethod != null)
        {
            transaction.PaymentMethod = NullIfEmpty(dto.PaymentMethod);
        }

        if (dto.CounterpartyName != null)
        {
            transaction.CounterpartyName = NullIfEmpty(dto.CounterpartyName);
        }

        if (dto.RelatedTaskId != null)
        {
            transaction.RelatedTaskId = NullIfEmpty(dto.RelatedTaskId);
        }

        if (dto.RelatedHarvestId != null)
        {
            transaction.RelatedHarvestId = NullIfEmpty(dto.RelatedHarvestId);
        }

        if (dto.RelatedCollaboratorId != null)
        {
            transaction.RelatedCollaboratorId = NullIfEmpty(dto.RelatedCollaboratorId);
        }

        if (dto.AttachmentIds != null)
        {
            transaction.AttachmentIds = dto.AttachmentIds.Where(idValue => !string.IsNullOrWhiteSpace(idValue)).Distinct().ToList();
        }

        if (dto.Notes != null)
        {
            transaction.Notes = NullIfEmpty(dto.Notes);
        }

        if (dto.ClearQuantity)
        {
            transaction.Quantity = null;
            transaction.QuantityUnit = null;
            transaction.UnitPrice = null;
            transaction.CalculationMode = FinancialCalculationMode.TotalOnly;
            transaction.ProductKind = FinancialProductKindExtensions.FromCategory(transaction.Category);
        }

        if (dto.ProductKind != null)
        {
            transaction.ProductKind = string.IsNullOrWhiteSpace(dto.ProductKind)
                ? FinancialProductKindExtensions.FromCategory(transaction.Category)
                : FinancialProductKindExtensions.FromApiString(dto.ProductKind)
                    ?? throw new ValidationException("Unknown product kind.");
        }

        ApplyQuantityUpdate(transaction, dto);

        var fieldAfter = await ResolveFieldAsync(transaction.FieldId, cancellationToken);
        await EnsureRelationshipsAsync(fieldAfter, transaction.RelatedTaskId, transaction.RelatedHarvestId, cancellationToken);

        if (transaction.Status == FinancialTransactionStatus.Posted)
        {
            EnsurePostedRequirements(
                transaction.Amount,
                transaction.OccurredOn,
                transaction.ResultYear,
                transaction.Category,
                transaction.Description,
                transaction.Type);
        }

        var updated = await _transactions.UpdateAsync(transaction, cancellationToken);

        var auditType = "financial_edited";
        if (dto.AttachmentIds != null && !previousAttachments.SequenceEqual(updated.AttachmentIds))
        {
            auditType = "financial_attachment_added";
        }
        else if (previousTask != updated.RelatedTaskId || previousHarvest != updated.RelatedHarvestId)
        {
            auditType = "financial_relationship_changed";
        }

        await RecordAuditAsync(updated, userId, auditType, cancellationToken);
        return FinancialTransactionMapper.ToDto(updated);
    }

    public async Task<FinancialTransactionDto> PostAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var transaction = await LoadAsync(id, cancellationToken);
        var access = await _authorization.ResolveForTransactionAsync(transaction, userId, userRole, cancellationToken);
        if (transaction.Status == FinancialTransactionStatus.Void)
        {
            throw new ValidationException("A voided record cannot be posted again.");
        }

        if (transaction.Status == FinancialTransactionStatus.Posted)
        {
            return FinancialTransactionMapper.ToDto(transaction);
        }

        EnsureCanEdit(access, transaction, userId);
        EnsureCanCreate(access, transaction.Type);
        EnsurePostedRequirements(
            transaction.Amount,
            transaction.OccurredOn,
            transaction.ResultYear,
            transaction.Category,
            transaction.Description,
            transaction.Type);

        var now = _clock.UtcNow;
        transaction.Status = FinancialTransactionStatus.Posted;
        transaction.PostedAt = now;
        var posted = await _transactions.UpdateAsync(transaction, cancellationToken);
        await RecordAuditAsync(posted, userId, "financial_posted", cancellationToken);
        return FinancialTransactionMapper.ToDto(posted);
    }

    public async Task<FinancialTransactionDto> VoidAsync(
        string id,
        VoidFinancialTransactionDto dto,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var transaction = await LoadAsync(id, cancellationToken);
        var access = await _authorization.ResolveForTransactionAsync(transaction, userId, userRole, cancellationToken);
        if (!access.Can(FinancialCapabilities.Void))
        {
            throw new ForbiddenException("Only a field owner can void a transaction.");
        }

        if (transaction.Status == FinancialTransactionStatus.Void)
        {
            throw new ValidationException("This transaction has already been voided.");
        }

        if (transaction.Status == FinancialTransactionStatus.Draft)
        {
            throw new ValidationException("Draft transactions should be deleted, not voided.");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new ValidationException("A reason is required to void a transaction.");
        }

        var now = _clock.UtcNow;
        transaction.Status = FinancialTransactionStatus.Void;
        transaction.VoidReason = dto.Reason.Trim();
        transaction.VoidedAt = now;
        transaction.VoidedByUserId = userId;
        var voided = await _transactions.UpdateAsync(transaction, cancellationToken);
        await RecordAuditAsync(voided, userId, "financial_voided", cancellationToken);
        return FinancialTransactionMapper.ToDto(voided);
    }

    public async Task DeleteDraftAsync(
        string id,
        string userId,
        string userRole,
        CancellationToken cancellationToken = default)
    {
        var transaction = await LoadAsync(id, cancellationToken);
        var access = await _authorization.ResolveForTransactionAsync(transaction, userId, userRole, cancellationToken);
        if (transaction.Status != FinancialTransactionStatus.Draft)
        {
            throw new ValidationException("Posted transactions cannot be deleted. Void them instead.");
        }

        if (!access.IsOwner && transaction.CreatedByUserId != userId)
        {
            throw new ForbiddenException("You can only delete your own draft.");
        }

        await _transactions.DeleteAsync(id, cancellationToken);
    }

    private async Task<FinancialTransaction> LoadAsync(string id, CancellationToken cancellationToken)
    {
        return await _transactions.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException("Financial transaction not found.");
    }

    private async Task<Field?> ResolveFieldAsync(string? fieldId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            return null;
        }

        return await _fields.GetByIdAsync(fieldId, cancellationToken)
            ?? throw new NotFoundException("Field not found.");
    }

    private async Task<FinancialAccess> ResolveAccessAsync(
        string? fieldId,
        string userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(fieldId))
        {
            var access = await _authorization.ResolveForUnassignedAsync(userId, userRole, cancellationToken);
            if (!access.IsOwner)
            {
                throw new ForbiddenException("Only the grove owner can record unassigned farm money.");
            }

            return access;
        }

        return await _authorization.ResolveForFieldAsync(fieldId, userId, userRole, cancellationToken);
    }

    private static void EnsureCanCreate(FinancialAccess access, FinancialTransactionType type)
    {
        if (type == FinancialTransactionType.Income && !access.Can(FinancialCapabilities.AddIncome))
        {
            throw new ForbiddenException("You cannot record income.");
        }

        if (type == FinancialTransactionType.Expense && !access.Can(FinancialCapabilities.AddExpense))
        {
            throw new ForbiddenException("You cannot record an expense.");
        }
    }

    private static void EnsureCanEdit(FinancialAccess access, FinancialTransaction transaction, string userId)
    {
        if (transaction.Status == FinancialTransactionStatus.Void)
        {
            throw new ValidationException("Voided transactions cannot be edited.");
        }

        if (transaction.Status == FinancialTransactionStatus.Posted)
        {
            if (!access.Can(FinancialCapabilities.EditPosted))
            {
                throw new ForbiddenException("You cannot edit a posted transaction.");
            }

            return;
        }

        if (access.IsOwner || (access.Can(FinancialCapabilities.EditOwnDraft) && transaction.CreatedByUserId == userId))
        {
            return;
        }

        throw new ForbiddenException("You can only edit your own draft.");
    }

    private bool CanView(FinancialAccess access, FinancialTransaction transaction, string userId) =>
        _authorization.CanViewTransaction(access, transaction, userId);

    private async Task EnsureRelationshipsAsync(
        Field? field,
        string? relatedTaskId,
        string? relatedHarvestId,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(relatedTaskId))
        {
            if (field == null)
            {
                throw new ValidationException("A task can only be linked when a field is selected.");
            }

            var fieldTask = await _fieldTasks.GetByIdAsync(relatedTaskId, cancellationToken)
                ?? throw new ValidationException("Task not found.");
            if (fieldTask.FieldId != field.Id)
            {
                throw new ValidationException("Task does not belong to this field.");
            }
        }

        if (!string.IsNullOrWhiteSpace(relatedHarvestId))
        {
            if (field == null)
            {
                throw new ValidationException("A harvest can only be linked when a field is selected.");
            }

            var harvest = await _harvests.GetByIdAsync(relatedHarvestId, cancellationToken)
                ?? throw new ValidationException("Harvest not found.");
            if (harvest.FieldId != field.Id)
            {
                throw new ValidationException("Harvest does not belong to this field.");
            }
        }
    }

    private static void ApplyQuantityUpdate(FinancialTransaction transaction, UpdateFinancialTransactionDto dto)
    {
        var quantityTouched = dto.Quantity.HasValue
            || dto.UnitPrice.HasValue
            || dto.Amount.HasValue
            || dto.CalculationMode != null
            || dto.QuantityUnit != null;
        if (!quantityTouched)
        {
            return;
        }

        var mode = dto.CalculationMode != null
            ? FinancialCalculationModeExtensions.FromApiString(dto.CalculationMode)
                ?? throw new ValidationException("Unknown calculation mode.")
            : transaction.CalculationMode;
        var unit = dto.QuantityUnit != null
            ? FinancialQuantityUnitExtensions.FromApiString(dto.QuantityUnit)
            : transaction.QuantityUnit;
        var calculated = ResolveQuantity(
            mode,
            dto.Quantity ?? transaction.Quantity,
            unit,
            dto.UnitPrice ?? transaction.UnitPrice,
            dto.Amount ?? transaction.Amount,
            transaction.Category);
        ApplyQuantity(transaction, calculated);
    }

    private static QuantityCalculation ResolveQuantityFromCreate(
        CreateFinancialTransactionDto dto,
        FinancialTransactionCategory? category)
    {
        var mode = FinancialCalculationModeExtensions.FromApiString(dto.CalculationMode)
            ?? FinancialCalculationMode.TotalOnly;
        var unit = FinancialQuantityUnitExtensions.FromApiString(dto.QuantityUnit);
        return ResolveQuantity(mode, dto.Quantity, unit, dto.UnitPrice, dto.Amount, category);
    }

    private static QuantityCalculation ResolveQuantity(
        FinancialCalculationMode mode,
        decimal? quantity,
        FinancialQuantityUnit? unit,
        decimal? unitPrice,
        decimal? amount,
        FinancialTransactionCategory? category)
    {
        var resolvedUnit = unit
            ?? (mode == FinancialCalculationMode.TotalOnly
                ? unit
                : FinancialQuantityCalculator.DefaultUnit(category));
        try
        {
            return FinancialQuantityCalculator.Resolve(mode, quantity, resolvedUnit, unitPrice, amount);
        }
        catch (ArgumentException ex)
        {
            throw new ValidationException(ex.Message);
        }
    }

    private static void ApplyQuantity(FinancialTransaction transaction, QuantityCalculation quantity)
    {
        transaction.Amount = quantity.Amount;
        transaction.Quantity = quantity.Quantity;
        transaction.QuantityUnit = quantity.QuantityUnit;
        transaction.UnitPrice = quantity.UnitPrice;
        transaction.CalculationMode = quantity.Mode;
    }

    private static void EnsurePostedRequirements(
        decimal amount,
        DateTime occurredOn,
        int resultYear,
        FinancialTransactionCategory? category,
        string? description,
        FinancialTransactionType type)
    {
        EnsureAmount(amount);
        if (occurredOn == default)
        {
            throw new ValidationException("Date is required.");
        }

        if (resultYear < FinancialCalculator.MinResultYear)
        {
            throw new ValidationException("Result year is required.");
        }

        if (category is null)
        {
            throw new ValidationException("Category is required.");
        }

        EnsureCategoryMatchesType(category, type);

        if (string.IsNullOrWhiteSpace(description))
        {
            throw new ValidationException("Description is required.");
        }
    }

    private static void EnsureAmount(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ValidationException("Amount must be greater than zero.");
        }
    }

    private static void EnsureCategoryMatchesType(FinancialTransactionCategory? category, FinancialTransactionType type)
    {
        if (category.HasValue && !category.Value.BelongsTo(type))
        {
            throw new ValidationException("Category does not match the transaction type.");
        }
    }

    private void EnsureResultYear(int resultYear, DateTime utcNow)
    {
        if (!FinancialCalculator.IsResultYearInRange(resultYear, utcNow))
        {
            throw new ValidationException("Result year is outside the allowed range.");
        }
    }

    private static DateTime NormalizeOccurredOn(DateTime? value, DateTime utcNow)
    {
        if (value is null)
        {
            return utcNow;
        }

        var date = value.Value;
        if (date.Kind == DateTimeKind.Unspecified && date.TimeOfDay == TimeSpan.Zero)
        {
            var unspecified = DateTime.SpecifyKind(date, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(unspecified, AthensTime.TimeZone);
        }

        return date.Kind == DateTimeKind.Utc ? date : date.ToUniversalTime();
    }

    private static FinancialTransactionSourceType ResolveSourceType(
        string? sourceType,
        string? relatedTaskId,
        string? relatedHarvestId)
    {
        var parsed = FinancialTransactionSourceTypeExtensions.FromApiString(sourceType);
        if (parsed.HasValue)
        {
            return parsed.Value;
        }

        if (!string.IsNullOrWhiteSpace(relatedHarvestId))
        {
            return FinancialTransactionSourceType.Harvest;
        }

        if (!string.IsNullOrWhiteSpace(relatedTaskId))
        {
            return FinancialTransactionSourceType.Task;
        }

        return FinancialTransactionSourceType.Manual;
    }

    private static string NormalizeIdempotencyKey(string? key) =>
        string.IsNullOrWhiteSpace(key) ? string.Empty : key.Trim();

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private async Task RecordAuditAsync(
        FinancialTransaction transaction,
        string actorUserId,
        string type,
        CancellationToken cancellationToken)
    {
        var amountText = transaction.Amount.ToString("0.##", CultureInfo.InvariantCulture);
        var message = type switch
        {
            "financial_posted" => $"posted {amountText} EUR",
            "financial_voided" => $"voided {amountText} EUR",
            "financial_attachment_added" => "added a receipt",
            "financial_relationship_changed" => "changed a financial link",
            "financial_edited" => $"edited {amountText} EUR",
            _ => $"recorded {amountText} EUR"
        };

        await _activityService.RecordAsync(
            transaction.FieldId ?? string.Empty,
            type,
            message,
            actorUserId,
            transaction.RelatedTaskId,
            new Dictionary<string, string>
            {
                ["transactionId"] = transaction.Id,
                ["amount"] = amountText,
                ["currency"] = transaction.Currency,
                ["type"] = transaction.Type.ToApiString(),
                ["status"] = transaction.Status.ToApiString()
            },
            cancellationToken);
    }
}
