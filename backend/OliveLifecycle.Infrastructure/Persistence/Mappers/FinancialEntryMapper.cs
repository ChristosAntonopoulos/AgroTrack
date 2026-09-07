using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class FinancialEntryMapper
{
    public static FinancialEntry ToEntity(FinancialEntryDocument document) => new()
    {
        Id = document.Id,
        FieldId = document.FieldId,
        LifecycleYear = document.LifecycleYear,
        TaskId = document.TaskId,
        HarvestId = document.HarvestId,
        Kind = FinancialEntryKindExtensions.FromApiString(document.Kind),
        Amount = document.Amount,
        Currency = document.Currency,
        Description = document.Description,
        Bucket = FinancialCategoryBucketExtensions.FromApiString(document.Bucket),
        Category = FinancialCategoryExtensions.FromApiString(document.Category),
        Quantity = document.Quantity,
        Unit = document.Unit,
        UnitPrice = document.UnitPrice,
        OccurredOn = document.OccurredOn,
        Status = FinancialEntryStatusExtensions.FromApiString(document.Status),
        RecordedBy = document.RecordedBy,
        Notes = document.Notes,
        VoidReason = document.VoidReason,
        VoidedAt = document.VoidedAt,
        VoidedBy = document.VoidedBy,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static FinancialEntryDocument ToDocument(FinancialEntry entity) => new()
    {
        Id = entity.Id,
        FieldId = entity.FieldId,
        LifecycleYear = entity.LifecycleYear,
        TaskId = entity.TaskId,
        HarvestId = entity.HarvestId,
        Kind = entity.Kind.ToApiString(),
        Amount = entity.Amount,
        Currency = entity.Currency,
        Description = entity.Description,
        Bucket = entity.Bucket?.ToApiString(),
        Category = entity.Category?.ToApiString(),
        Quantity = entity.Quantity,
        Unit = entity.Unit,
        UnitPrice = entity.UnitPrice,
        OccurredOn = entity.OccurredOn,
        Status = entity.Status.ToApiString(),
        RecordedBy = entity.RecordedBy,
        Notes = entity.Notes,
        VoidReason = entity.VoidReason,
        VoidedAt = entity.VoidedAt,
        VoidedBy = entity.VoidedBy,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
