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

    public static OilLot ToEntity(OilLotDocument document) => new()
    {
        Id = document.Id,
        OwnerUserId = document.OwnerUserId,
        BatchId = document.BatchId,
        PressedOn = document.PressedOn,
        ResultYear = document.ResultYear,
        HarvestRecordIds = document.HarvestRecordIds ?? [],
        FieldIds = document.FieldIds ?? [],
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
        OwnerUserId = entity.OwnerUserId,
        BatchId = entity.BatchId,
        PressedOn = entity.PressedOn,
        ResultYear = entity.ResultYear,
        HarvestRecordIds = entity.HarvestRecordIds,
        FieldIds = entity.FieldIds,
        TotalAmount = entity.TotalAmount,
        Unit = entity.Unit,
        MillKept = entity.MillKept,
        ConversionFactor = entity.ConversionFactor,
        Packing = ToPackDocument(entity.Packing),
        Notes = entity.Notes,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };

    public static OilCommitment ToEntity(OilCommitmentDocument document) => new()
    {
        Id = document.Id,
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

    public static StockMovement ToEntity(StockMovementDocument document) => new()
    {
        Id = document.Id,
        OwnerUserId = document.OwnerUserId,
        OilLotId = document.OilLotId,
        OilCommitmentId = document.OilCommitmentId,
        Kind = Enum.TryParse<StockMovementKind>(document.Kind, true, out var kind)
            ? kind
            : StockMovementKind.Correction,
        PackDelta = ToPack(document.PackDelta),
        LitresDelta = document.LitresDelta,
        Notes = document.Notes,
        OccurredOn = document.OccurredOn,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt
    };

    public static StockMovementDocument ToDocument(StockMovement entity) => new()
    {
        Id = entity.Id,
        OwnerUserId = entity.OwnerUserId,
        OilLotId = entity.OilLotId,
        OilCommitmentId = entity.OilCommitmentId,
        Kind = entity.Kind.ToString(),
        PackDelta = ToPackDocument(entity.PackDelta),
        LitresDelta = entity.LitresDelta,
        Notes = entity.Notes,
        OccurredOn = entity.OccurredOn,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt
    };
}
