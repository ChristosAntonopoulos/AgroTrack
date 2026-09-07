using OliveLifecycle.Application.DTOs.Financial;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Application.Mappings;

public static class FinancialEntryMapper
{
    public static FinancialEntryDto ToDto(FinancialEntry entry) => new()
    {
        Id = entry.Id,
        FieldId = entry.FieldId,
        LifecycleYear = entry.LifecycleYear,
        TaskId = entry.TaskId,
        HarvestId = entry.HarvestId,
        Kind = entry.Kind.ToApiString(),
        Amount = entry.Amount,
        Currency = entry.Currency,
        Description = entry.Description,
        Bucket = entry.Bucket?.ToApiString(),
        Category = entry.Category?.ToApiString(),
        Quantity = entry.Quantity,
        Unit = entry.Unit,
        UnitPrice = entry.UnitPrice,
        OccurredOn = entry.OccurredOn,
        Status = entry.Status.ToApiString(),
        RecordedBy = entry.RecordedBy,
        Notes = entry.Notes,
        VoidReason = entry.VoidReason,
        VoidedAt = entry.VoidedAt,
        VoidedBy = entry.VoidedBy,
        CreatedAt = entry.CreatedAt,
        UpdatedAt = entry.UpdatedAt
    };
}
