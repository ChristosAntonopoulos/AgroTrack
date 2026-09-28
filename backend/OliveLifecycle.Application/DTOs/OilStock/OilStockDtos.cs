using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Application.DTOs.OilStock;

public sealed class OilPackDto
{
    public int Tin16 { get; set; }
    public int Tin17 { get; set; }
    public decimal BulkLitres { get; set; }
    public decimal Litres { get; set; }
}

public sealed class OilLotDto
{
    public string Id { get; set; } = string.Empty;
    public string BatchId { get; set; } = string.Empty;
    public DateTime PressedOn { get; set; }
    public int ResultYear { get; set; }
    public IReadOnlyList<string> HarvestRecordIds { get; set; } = [];
    public IReadOnlyList<string> FieldIds { get; set; } = [];
    public decimal TotalAmount { get; set; }
    public string Unit { get; set; } = "litres";
    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }
    public decimal FarmerLitres { get; set; }
    public OilPackDto Packing { get; set; } = new();
    public OilPackDto Reserved { get; set; } = new();
    public OilPackDto Available { get; set; } = new();
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class UpsertOilLotDto
{
    public string BatchId { get; set; } = string.Empty;
    public DateTime? PressedOn { get; set; }
    public int? ResultYear { get; set; }
    public List<string>? HarvestRecordIds { get; set; }
    public List<string>? FieldIds { get; set; }
    public decimal TotalAmount { get; set; }
    public string Unit { get; set; } = "litres";
    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }
    public OilPackDto? Packing { get; set; }
    public string? Notes { get; set; }
}

public sealed class PatchOilLotPackingDto
{
    public OilPackDto Packing { get; set; } = new();
    public decimal? MillKept { get; set; }
}

public sealed class RepackOilLotDto
{
    public int AddTin16 { get; set; }
    public int AddTin17 { get; set; }
}

public sealed class OilStockSummaryDto
{
    public OilPackDto Physical { get; set; } = new();
    public OilPackDto Reserved { get; set; } = new();
    public OilPackDto PendingDelivery { get; set; } = new();
    public OilPackDto Available { get; set; } = new();
    public OilPackDto Delivered { get; set; } = new();
    public int OpenReservationCount { get; set; }
    public int PendingDeliveryCount { get; set; }
    public IReadOnlyList<OilLotDto> Lots { get; set; } = [];
    public IReadOnlyList<OilCommitmentDto> OpenCommitments { get; set; } = [];
}

public sealed class OilLotAllocationDto
{
    public string OilLotId { get; set; } = string.Empty;
    public OilPackDto Pack { get; set; } = new();
}

public sealed class OilCommitmentDto
{
    public string Id { get; set; } = string.Empty;
    public string? ContactId { get; set; }
    public string CounterpartyName { get; set; } = string.Empty;
    public OilPackDto Requested { get; set; } = new();
    public OilPackDto Delivered { get; set; } = new();
    public OilPackDto Remaining { get; set; } = new();
    public bool IsSale { get; set; }
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public string? FinancialTransactionId { get; set; }
    public IReadOnlyList<OilLotAllocationDto> Allocations { get; set; } = [];
    public DateTime? PromisedFor { get; set; }
    public string? Notes { get; set; }
    public bool Cancelled { get; set; }
    /// <summary>reserved | pending_delivery | delivered | cancelled</summary>
    public string DerivedStatus { get; set; } = "reserved";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class CreateOilCommitmentDto
{
    public string? ContactId { get; set; }
    public string CounterpartyName { get; set; } = string.Empty;
    public OilPackDto Requested { get; set; } = new();
    public bool IsSale { get; set; }
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    public bool AlreadyDelivered { get; set; }
    public DateTime? PromisedFor { get; set; }
    public string? Notes { get; set; }
    /// <summary>Optional manual lot picks. Empty = FIFO auto-allocate.</summary>
    public List<OilLotAllocationDto>? Allocations { get; set; }
}

public sealed class DeliverOilCommitmentDto
{
    /// <summary>Partial delivery pack. Null/empty = deliver everything still remaining.</summary>
    public OilPackDto? Pack { get; set; }
}

public sealed class StockMovementDto
{
    public string Id { get; set; } = string.Empty;
    public string? OilLotId { get; set; }
    public string? OilCommitmentId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public OilPackDto PackDelta { get; set; } = new();
    public decimal LitresDelta { get; set; }
    public string? Notes { get; set; }
    public DateTime OccurredOn { get; set; }
}

public sealed class AdjustStockDto
{
    public string OilLotId { get; set; } = string.Empty;
    /// <summary>gifted | home_use | consumed | correction | returned</summary>
    public string Kind { get; set; } = "correction";
    public OilPackDto Pack { get; set; } = new();
    public string? Notes { get; set; }
    public string? CounterpartyName { get; set; }
}

public static class OilStockDtoMapper
{
    public static OilPackDto ToDto(OilPack pack) => new()
    {
        Tin16 = pack.Tin16,
        Tin17 = pack.Tin17,
        BulkLitres = OilPackMath.Round1(pack.BulkLitres),
        Litres = OilPackMath.PackLitres(pack)
    };

    public static OilPack FromDto(OilPackDto? dto) => dto is null
        ? OilPack.Empty()
        : new OilPack
        {
            Tin16 = Math.Max(0, dto.Tin16),
            Tin17 = Math.Max(0, dto.Tin17),
            BulkLitres = OilPackMath.Round1(Math.Max(0, dto.BulkLitres))
        };
}
