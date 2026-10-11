using OliveLifecycle.Common.Constants;
using OliveLifecycle.Core;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.OilStock;
using OliveLifecycle.Core.Time;

namespace OliveLifecycle.Application.Tests.Qa;

/// <summary>
/// Shared builders for QA_* regression tests (owner, collaborator, fields, harvest, oil, money).
/// </summary>
public static class QaTestFixtures
{
    public const string OwnerId = "qa-owner-1";
    public const string CollaboratorId = "qa-collab-1";
    public const string EditableFieldId = "qa-field-editable";
    public const string ViewOnlyFieldId = "qa-field-viewonly";

    public static Field OwnerField(
        string id,
        string name = "Stasto",
        string ownerId = OwnerId,
        IEnumerable<string>? modulesForCollaborator = null,
        FieldPersonRole collabRole = FieldPersonRole.Partner,
        string accessLevel = FamilyAccessLevels.Work)
    {
        var field = new Field
        {
            Id = id,
            Name = name,
            OwnerId = ownerId,
            Status = FieldStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        FieldPeopleRules.EnsureNormalized(field);
        if (modulesForCollaborator is not null)
        {
            field.People.Add(new FieldPerson
            {
                UserId = CollaboratorId,
                Role = collabRole,
                AccessLevel = accessLevel,
                Modules = modulesForCollaborator.Select(FamilyModules.Normalize).Where(FamilyModules.IsKnown).ToList(),
                Status = FamilyMemberStatuses.Active,
                CreatedAt = DateTime.UtcNow
            });
        }

        return field;
    }

    public static BillingProfile FreePlanWithWritable(
        string userId,
        string? writableFieldId,
        bool needsSelection = false) => new()
    {
        UserId = userId,
        EntitlementActive = false,
        PlanCode = PlanCode.Free,
        SelectedWritableFieldId = writableFieldId,
        NeedsWritableFieldSelection = needsSelection,
        SelectedWritableFieldIdChangedAt = writableFieldId is null ? null : DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public static HarvestRecord HarvestDay(
        string fieldId,
        string ownerId = OwnerId,
        int sackCount = 1,
        double oliveKg = 20,
        decimal? oilLitres = 4,
        string? batchId = null,
        DateTime? harvestDate = null)
    {
        var when = harvestDate ?? new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
        return new HarvestRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            FieldId = fieldId,
            OwnerId = ownerId,
            HarvestDate = when,
            ResultYear = AgriculturalYear.For(when),
            HarvestMethod = oilLitres is > 0 ? "oil" : "sacks",
            SackCount = sackCount,
            OliveKg = oliveKg,
            OilLitres = oilLitres,
            BatchId = batchId,
            Status = FinancialEntryStatus.Posted,
            CreatedAt = when,
            UpdatedAt = when
        };
    }

    public static OilCellar Cellar(string ownerUserId, string? cellarId = null) => new()
    {
        Id = cellarId ?? Guid.NewGuid().ToString("N"),
        OwnerPersonId = ownerUserId,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    public static OilLot Lot(
        OilCellar cellar,
        decimal bulkLitres,
        string? batchId = null,
        IEnumerable<string>? fieldIds = null,
        IEnumerable<string>? harvestIds = null)
    {
        var packing = new OilPack { BulkLitres = bulkLitres };
        return new OilLot
        {
            Id = Guid.NewGuid().ToString("N"),
            CellarId = cellar.Id,
            OwnerUserId = cellar.OwnerPersonId,
            BatchId = batchId ?? Guid.NewGuid().ToString("N"),
            PressedOn = DateTime.UtcNow,
            ResultYear = AgriculturalYear.For(DateTime.UtcNow),
            TotalAmount = bulkLitres,
            Unit = "litres",
            Packing = packing,
            FieldIds = fieldIds?.ToList() ?? [],
            HarvestRecordIds = harvestIds?.ToList() ?? [],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static FinancialTransaction MoneyIncome(
        string ownerId,
        decimal amount,
        string? fieldId = null,
        string? sourceId = null) => new()
    {
        Id = Guid.NewGuid().ToString("N"),
        OwnerUserId = ownerId,
        FieldId = fieldId,
        Type = FinancialTransactionType.Income,
        Amount = amount,
        Currency = "EUR",
        Category = FinancialTransactionCategory.OliveOilSale,
        Status = FinancialTransactionStatus.Posted,
        OccurredOn = DateTime.UtcNow,
        PostedAt = DateTime.UtcNow,
        SourceType = FinancialTransactionSourceType.Manual,
        SourceId = sourceId,
        IdempotencyKey = Guid.NewGuid().ToString("N"),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
}
