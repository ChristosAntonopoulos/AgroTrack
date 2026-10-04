using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.OilStock;
using OliveLifecycle.Infrastructure.Persistence.Documents;

namespace OliveLifecycle.Infrastructure.Persistence.Mappers;

public static class OilStockMapper
{
    public static OilPack ToPack(OilPackDocument? document) => document is null
        ? OilPack.Empty()
        : new OilPack
        {
            Tin16 = document.Tin16,
            Tin17 = document.Tin17,
            BulkLitres = document.BulkLitres
        };

    public static OilPackDocument ToPackDocument(OilPack pack) => new()
    {
        Tin16 = pack.Tin16,
        Tin17 = pack.Tin17,
        BulkLitres = pack.BulkLitres
    };

    public static List<OilProvenanceEntry> ToProvenance(IEnumerable<OilProvenanceEntryDocument>? documents) =>
        (documents ?? [])
            .Select(d => new OilProvenanceEntry { FieldId = d.FieldId, Share = d.Share })
            .ToList();

    public static List<OilProvenanceEntryDocument>? ToProvenanceDocuments(
        IReadOnlyCollection<OilProvenanceEntry>? entries) =>
        entries is null || entries.Count == 0
            ? null
            : entries
                .Select(e => new OilProvenanceEntryDocument { FieldId = e.FieldId, Share = e.Share })
                .ToList();

    public static OilCellar ToEntity(OilCellarDocument document) => new()
    {
        Id = document.Id,
        OwnerPersonId = document.OwnerPersonId,
        Name = document.Name ?? string.Empty,
        Status = document.Status ?? OilCellarStatuses.Active,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static OilCellarDocument ToDocument(OilCellar entity) => new()
    {
        Id = entity.Id,
        OwnerPersonId = entity.OwnerPersonId,
        Name = entity.Name,
        Status = entity.Status,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static OilLot ToEntity(OilLotDocument document) => new()
    {
        Id = document.Id,
        CellarId = document.CellarId ?? string.Empty,
        OwnerUserId = document.OwnerUserId,
        BatchId = document.BatchId,
        SourcePressingId = document.SourcePressingId,
        PressedOn = document.PressedOn,
        ResultYear = document.ResultYear,
        HarvestRecordIds = document.HarvestRecordIds ?? [],
        FieldIds = document.FieldIds ?? [],
        Provenance = ToProvenance(document.Provenance),
        TotalAmount = document.TotalAmount,
        Unit = document.Unit,
        MillKept = document.MillKept,
        ConversionFactor = document.ConversionFactor,
        Packing = ToPack(document.Packing),
        Notes = document.Notes,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static OilLotDocument ToDocument(OilLot entity) => new()
    {
        Id = entity.Id,
        CellarId = string.IsNullOrWhiteSpace(entity.CellarId) ? null : entity.CellarId,
        OwnerUserId = entity.OwnerUserId,
        BatchId = entity.BatchId,
        SourcePressingId = entity.SourcePressingId,
        PressedOn = entity.PressedOn,
        ResultYear = entity.ResultYear,
        HarvestRecordIds = entity.HarvestRecordIds,
        FieldIds = entity.FieldIds,
        Provenance = ToProvenanceDocuments(entity.Provenance),
        TotalAmount = entity.TotalAmount,
        Unit = entity.Unit,
        MillKept = entity.MillKept,
        ConversionFactor = entity.ConversionFactor,
        Packing = ToPackDocument(entity.Packing),
        Notes = entity.Notes,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static OilPressing ToEntity(OilPressingDocument document) => new()
    {
        Id = document.Id,
        CampaignId = document.CampaignId,
        BatchId = document.BatchId,
        PressedOn = document.PressedOn,
        ResultYear = document.ResultYear,
        TotalLitres = document.TotalLitres,
        Unit = document.Unit,
        MillKept = document.MillKept,
        ConversionFactor = document.ConversionFactor,
        FieldIds = document.FieldIds ?? [],
        Provenance = ToProvenance(document.Provenance),
        RecordedByUserId = document.RecordedByUserId,
        Status = document.Status ?? OilPressingStatuses.Confirmed,
        HarvestRecordIds = document.HarvestRecordIds ?? [],
        Notes = document.Notes,
        Allocations = (document.Allocations ?? [])
            .Select(a => new PressingAllocation
            {
                PressingId = a.PressingId,
                CellarId = a.CellarId,
                Litres = a.Litres,
                AllocatedBy = a.AllocatedBy,
                AllocatedAt = a.AllocatedAt,
                OilLotId = a.OilLotId
            })
            .ToList(),
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static OilPressingDocument ToDocument(OilPressing entity) => new()
    {
        Id = entity.Id,
        CampaignId = entity.CampaignId,
        BatchId = entity.BatchId,
        PressedOn = entity.PressedOn,
        ResultYear = entity.ResultYear,
        TotalLitres = entity.TotalLitres,
        Unit = entity.Unit,
        MillKept = entity.MillKept,
        ConversionFactor = entity.ConversionFactor,
        FieldIds = entity.FieldIds,
        Provenance = ToProvenanceDocuments(entity.Provenance),
        RecordedByUserId = entity.RecordedByUserId,
        Status = entity.Status,
        HarvestRecordIds = entity.HarvestRecordIds,
        Notes = entity.Notes,
        Allocations = entity.Allocations
            .Select(a => new PressingAllocationDocument
            {
                PressingId = a.PressingId,
                CellarId = a.CellarId,
                Litres = a.Litres,
                AllocatedBy = a.AllocatedBy,
                AllocatedAt = a.AllocatedAt,
                OilLotId = a.OilLotId
            })
            .ToList(),
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static OilCommitment ToEntity(OilCommitmentDocument document) => new()
    {
        Id = document.Id,
        CellarId = document.CellarId ?? string.Empty,
        OwnerUserId = document.OwnerUserId,
        ContactId = document.ContactId,
        CounterpartyName = document.CounterpartyName,
        Requested = ToPack(document.Requested),
        Delivered = ToPack(document.Delivered),
        IsSale = document.IsSale,
        Amount = document.Amount,
        Currency = document.Currency,
        FinancialTransactionId = document.FinancialTransactionId,
        Allocations = (document.Allocations ?? [])
            .Select(a => new OilLotAllocation
            {
                OilLotId = a.OilLotId,
                Pack = ToPack(a.Pack)
            })
            .ToList(),
        PromisedFor = document.PromisedFor,
        Notes = document.Notes,
        Cancelled = document.Cancelled,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static OilCommitmentDocument ToDocument(OilCommitment entity) => new()
    {
        Id = entity.Id,
        CellarId = string.IsNullOrWhiteSpace(entity.CellarId) ? null : entity.CellarId,
        OwnerUserId = entity.OwnerUserId,
        ContactId = entity.ContactId,
        CounterpartyName = entity.CounterpartyName,
        Requested = ToPackDocument(entity.Requested),
        Delivered = ToPackDocument(entity.Delivered),
        IsSale = entity.IsSale,
        Amount = entity.Amount,
        Currency = entity.Currency,
        FinancialTransactionId = entity.FinancialTransactionId,
        Allocations = entity.Allocations
            .Select(a => new OilLotAllocationDocument
            {
                OilLotId = a.OilLotId,
                Pack = ToPackDocument(a.Pack)
            })
            .ToList(),
        PromisedFor = entity.PromisedFor,
        Notes = entity.Notes,
        Cancelled = entity.Cancelled,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static OilShareRequest ToEntity(OilShareRequestDocument document) => new()
    {
        Id = document.Id,
        FromCellarId = document.FromCellarId ?? string.Empty,
        ToCellarId = document.ToCellarId ?? string.Empty,
        FromOwnerUserId = document.FromOwnerUserId,
        ToUserId = document.ToUserId,
        FromDisplayName = document.FromDisplayName ?? string.Empty,
        ToDisplayName = document.ToDisplayName ?? string.Empty,
        Requested = ToPack(document.Requested),
        FieldIds = document.FieldIds ?? [],
        Notes = document.Notes,
        Status = document.Status ?? OilShareRequestStatuses.Pending,
        ResultLotId = document.ResultLotId,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static OilShareRequestDocument ToDocument(OilShareRequest entity) => new()
    {
        Id = entity.Id,
        FromCellarId = string.IsNullOrWhiteSpace(entity.FromCellarId) ? null : entity.FromCellarId,
        ToCellarId = string.IsNullOrWhiteSpace(entity.ToCellarId) ? null : entity.ToCellarId,
        FromOwnerUserId = entity.FromOwnerUserId,
        ToUserId = entity.ToUserId,
        FromDisplayName = entity.FromDisplayName,
        ToDisplayName = entity.ToDisplayName,
        Requested = ToPackDocument(entity.Requested),
        FieldIds = entity.FieldIds,
        Notes = entity.Notes,
        Status = entity.Status,
        ResultLotId = entity.ResultLotId,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static StockMovement ToEntity(StockMovementDocument document) => new()
    {
        Id = document.Id,
        CellarId = document.CellarId ?? string.Empty,
        OwnerUserId = document.OwnerUserId,
        OilLotId = document.OilLotId,
        OilCommitmentId = document.OilCommitmentId,
        Kind = Enum.TryParse<StockMovementKind>(document.Kind, true, out var kind)
            ? kind
            : StockMovementKind.Correction,
        PackDelta = ToPack(document.PackDelta),
        LitresDelta = document.LitresDelta,
        TransferId = document.TransferId,
        ReversalOfMovementId = document.ReversalOfMovementId,
        Notes = document.Notes,
        OccurredOn = document.OccurredOn,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static StockMovementDocument ToDocument(StockMovement entity) => new()
    {
        Id = entity.Id,
        CellarId = string.IsNullOrWhiteSpace(entity.CellarId) ? null : entity.CellarId,
        OwnerUserId = entity.OwnerUserId,
        OilLotId = entity.OilLotId,
        OilCommitmentId = entity.OilCommitmentId,
        Kind = entity.Kind.ToString(),
        PackDelta = ToPackDocument(entity.PackDelta),
        LitresDelta = entity.LitresDelta,
        TransferId = entity.TransferId,
        ReversalOfMovementId = entity.ReversalOfMovementId,
        Notes = entity.Notes,
        OccurredOn = entity.OccurredOn,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
