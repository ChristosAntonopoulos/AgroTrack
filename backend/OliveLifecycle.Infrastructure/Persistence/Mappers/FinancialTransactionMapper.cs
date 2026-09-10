using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class FinancialTransactionMapper
{
    public static FinancialTransaction ToEntity(FinancialTransactionDocument document) => new()
    {
        Id = document.Id,
        OwnerUserId = document.OwnerUserId,
        Type = FinancialTransactionTypeExtensions.FromApiString(document.Type) ?? FinancialTransactionType.Expense,
        Status = FinancialTransactionStatusExtensions.FromApiString(document.Status) ?? FinancialTransactionStatus.Draft,
        Amount = document.Amount,
        Currency = document.Currency,
        OccurredOn = document.OccurredOn,
        ResultYear = document.ResultYear,
        FieldId = document.FieldId,
        Category = FinancialTransactionCategoryExtensions.FromApiString(document.Category),
        ProductKind = FinancialProductKindExtensions.FromApiString(document.ProductKind),
        Quantity = document.Quantity,
        QuantityUnit = FinancialQuantityUnitExtensions.FromApiString(document.QuantityUnit),
        UnitPrice = document.UnitPrice,
        CalculationMode = FinancialCalculationModeExtensions.FromApiString(document.CalculationMode)
            ?? FinancialCalculationMode.TotalOnly,
        Description = document.Description,
        PaymentMethod = document.PaymentMethod,
        CounterpartyName = document.CounterpartyName,
        RelatedTaskId = document.RelatedTaskId,
        RelatedHarvestId = document.RelatedHarvestId,
        RelatedCollaboratorId = document.RelatedCollaboratorId,
        SourceType = FinancialTransactionSourceTypeExtensions.FromApiString(document.SourceType) ?? FinancialTransactionSourceType.Manual,
        SourceId = document.SourceId,
        AttachmentIds = document.AttachmentIds ?? [],
        Notes = document.Notes,
        IdempotencyKey = document.IdempotencyKey,
        CreatedByUserId = document.CreatedByUserId,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt,
        PostedAt = document.PostedAt,
        VoidedAt = document.VoidedAt,
        VoidReason = document.VoidReason,
        VoidedByUserId = document.VoidedByUserId
    };

    public static FinancialTransactionDocument ToDocument(FinancialTransaction entity) => new()
    {
        Id = entity.Id,
        OwnerUserId = entity.OwnerUserId,
        Type = entity.Type.ToApiString(),
        Status = entity.Status.ToApiString(),
        Amount = entity.Amount,
        Currency = entity.Currency,
        OccurredOn = entity.OccurredOn,
        ResultYear = entity.ResultYear,
        FieldId = entity.FieldId,
        Category = entity.Category?.ToApiString(),
        ProductKind = entity.ProductKind?.ToApiString(),
        Quantity = entity.Quantity,
        QuantityUnit = entity.QuantityUnit?.ToApiString(),
        UnitPrice = entity.UnitPrice,
        CalculationMode = entity.CalculationMode.ToApiString(),
        Description = entity.Description,
        PaymentMethod = entity.PaymentMethod,
        CounterpartyName = entity.CounterpartyName,
        RelatedTaskId = entity.RelatedTaskId,
        RelatedHarvestId = entity.RelatedHarvestId,
        RelatedCollaboratorId = entity.RelatedCollaboratorId,
        SourceType = entity.SourceType.ToApiString(),
        SourceId = entity.SourceId,
        AttachmentIds = entity.AttachmentIds ?? [],
        Notes = entity.Notes,
        IdempotencyKey = entity.IdempotencyKey,
        CreatedByUserId = entity.CreatedByUserId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
        PostedAt = entity.PostedAt,
        VoidedAt = entity.VoidedAt,
        VoidReason = entity.VoidReason,
        VoidedByUserId = entity.VoidedByUserId
    };
}
