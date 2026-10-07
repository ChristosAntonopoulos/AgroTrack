using OliveLifecycle.Core.Entities;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class BillingProfileMapper
{
    public static BillingProfileDocument ToDocument(BillingProfile entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        PlanCode = entity.PlanCode,
        Status = entity.Status,
        Provider = entity.Provider,
        ProductId = entity.ProductId,
        CurrentPeriodEndsAt = entity.CurrentPeriodEndsAt,
        WillRenew = entity.WillRenew,
        EntitlementActive = entity.EntitlementActive,
        LastRevenueCatEventAt = entity.LastRevenueCatEventAt,
        SelectedWritableFieldId = entity.SelectedWritableFieldId,
        SelectedWritableFieldIdChangedAt = entity.SelectedWritableFieldIdChangedAt,
        NeedsWritableFieldSelection = entity.NeedsWritableFieldSelection,
        FieldCreationLockUntil = entity.FieldCreationLockUntil,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static BillingProfile ToEntity(BillingProfileDocument document) => new()
    {
        Id = document.Id,
        UserId = document.UserId,
        PlanCode = document.PlanCode,
        Status = document.Status,
        Provider = document.Provider,
        ProductId = document.ProductId,
        CurrentPeriodEndsAt = document.CurrentPeriodEndsAt,
        WillRenew = document.WillRenew,
        EntitlementActive = document.EntitlementActive,
        LastRevenueCatEventAt = document.LastRevenueCatEventAt,
        SelectedWritableFieldId = document.SelectedWritableFieldId,
        SelectedWritableFieldIdChangedAt = document.SelectedWritableFieldIdChangedAt,
        NeedsWritableFieldSelection = document.NeedsWritableFieldSelection,
        FieldCreationLockUntil = document.FieldCreationLockUntil,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };
}
