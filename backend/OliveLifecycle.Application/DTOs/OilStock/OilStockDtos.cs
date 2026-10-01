using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Application.DTOs.OilStock;

public sealed class OilPackDto
{
    public int Tin16 { get; set; }
    public int Tin17 { get; set; }
    public decimal BulkLitres { get; set; }
    public decimal Litres { get; set; }
}

public sealed class OilProvenanceEntryDto
{
    public string FieldId { get; set; } = string.Empty;
    /// <summary>Fraction of the lot from this grove (0..1).</summary>
    public decimal Share { get; set; }
}

public sealed class OilLotDto
{
    public string Id { get; set; } = string.Empty;
    /// <summary>Cellar holding this lot.</summary>
    public string CellarId { get; set; } = string.Empty;
    /// <summary>User whose personal cellar (Το λάδι μου) holds this lot.</summary>
    public string CellarOwnerUserId { get; set; } = string.Empty;
    public string BatchId { get; set; } = string.Empty;
    /// <summary>Pressing this lot was allocated from, when it came through the mill flow.</summary>
    public string? SourcePressingId { get; set; }
    public DateTime PressedOn { get; set; }
    public int ResultYear { get; set; }
    public IReadOnlyList<string> HarvestRecordIds { get; set; } = [];
    /// <summary>Grove shares summing to ~1.</summary>
    public IReadOnlyList<OilProvenanceEntryDto> Provenance { get; set; } = [];
    /// <summary>Derived from <see cref="Provenance"/>. Kept for older clients.</summary>
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
    /// <summary>Optional measured grove split. Omitted = equal shares over <see cref="FieldIds"/>.</summary>
    public List<OilProvenanceEntryDto>? Provenance { get; set; }
    public decimal TotalAmount { get; set; }
    public string Unit { get; set; } = "litres";
    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }
    public OilPackDto? Packing { get; set; }
    public string? Notes { get; set; }
    /// <summary>
    /// Whose cellar receives this oil. Defaults to the caller.
    /// Must be Admin or Family on a linked grove when fieldIds are set.
    /// </summary>
    public string? CellarOwnerUserId { get; set; }
    /// <summary>Pressing this lot belongs to, when created through the mill flow.</summary>
    public string? SourcePressingId { get; set; }
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
    /// <summary>Physical oil present in the cellar (packaging on hand).</summary>
    public OilPackDto OnHand { get; set; } = new();

    /// <summary>Promised or sale-pending reservations still in the cellar.</summary>
    public OilPackDto Held { get; set; } = new();

    /// <summary>Promise-only slice of Held (non-sale). Kept for UI breakdown.</summary>
    public OilPackDto Reserved { get; set; } = new();

    public OilPackDto PendingDelivery { get; set; } = new();

    /// <summary>OnHand − Held. Usable without breaking a promise.</summary>
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
    /// <summary>
    /// When set (e.g. income already posted via Money capture), link it and skip creating a second transaction.
    /// </summary>
    public string? FinancialTransactionId { get; set; }
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
    /// <summary>Shared by the two legs of one transfer (shared_out + shared_in).</summary>
    public string? TransferId { get; set; }
    /// <summary>Set when this movement undoes an earlier one.</summary>
    public string? ReversalOfMovementId { get; set; }
    public string? Notes { get; set; }
    public DateTime OccurredOn { get; set; }
}

public sealed class AdjustStockDto
{
    public string OilLotId { get; set; } = string.Empty;
    /// <summary>gifted | home_use | consumed | correction | returned</summary>
    public string Kind { get; set; } = "correction";
    public OilPackDto Pack { get; set; } = new();
    /// <summary>
    /// Correction/Returned take oil out instead of putting it in — a stock count that found less
    /// oil than the books expected.
    /// </summary>
    public bool Remove { get; set; }
    public string? Notes { get; set; }
    public string? CounterpartyName { get; set; }
}

public sealed class OilCellarCandidateDto
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsYou { get; set; }
}

public sealed class OilShareSourceDto
{
    public string FromOwnerUserId { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = string.Empty;
    public OilPackDto Available { get; set; } = new();
    public IReadOnlyList<string> FieldIds { get; set; } = [];
}

public sealed class OilShareRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string FromOwnerUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = string.Empty;
    public string ToDisplayName { get; set; } = string.Empty;
    public OilPackDto Requested { get; set; } = new();
    public IReadOnlyList<string> FieldIds { get; set; } = [];
    public string? Notes { get; set; }
    /// <summary>pending | accepted | rejected | cancelled</summary>
    public string Status { get; set; } = "pending";
    public string? ResultLotId { get; set; }
    public bool IsIncoming { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class CreateOilShareRequestDto
{
    public OilPackDto Requested { get; set; } = new();
    public List<string>? FieldIds { get; set; }
    public string? Notes { get; set; }
}

/// <summary>One slice of a pressing going into a single person's cellar.</summary>
public sealed class OilPressingAllocationDto
{
    public string CellarOwnerUserId { get; set; } = string.Empty;
    public string CellarId { get; set; } = string.Empty;
    public decimal Litres { get; set; }
    public string? OilLotId { get; set; }
}

public sealed class CreateOilPressingDto
{
    public string BatchId { get; set; } = string.Empty;
    public string? CampaignId { get; set; }
    public DateTime? PressedOn { get; set; }
    public int? ResultYear { get; set; }

    /// <summary>Mill ticket total as recorded, in <see cref="Unit"/>.</summary>
    public decimal TotalAmount { get; set; }

    public string Unit { get; set; } = "litres";
    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }
    public List<string>? FieldIds { get; set; }

    /// <summary>Optional measured grove split. Omitted = equal shares over <see cref="FieldIds"/>.</summary>
    public List<OilProvenanceEntryDto>? Provenance { get; set; }

    public List<string>? HarvestRecordIds { get; set; }
    public string? Notes { get; set; }

    /// <summary>
    /// Who takes home how much. Empty means: file all farmer litres into the grove admin cellar.
    /// </summary>
    public List<OilPressingAllocationDto>? Allocations { get; set; }
}

/// <summary>Admin pushes oil from their cellar into another platform user's cellar.</summary>
public sealed class TransferOilDto
{
    public string ToUserId { get; set; } = string.Empty;
    public OilPackDto Requested { get; set; } = new();
    public List<string>? FieldIds { get; set; }
    public string? Notes { get; set; }
}

public sealed class OilTransferDto
{
    public string TransferId { get; set; } = string.Empty;
    public string FromOwnerUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public string FromDisplayName { get; set; } = string.Empty;
    public string ToDisplayName { get; set; } = string.Empty;
    public OilPackDto Requested { get; set; } = new();
    public IReadOnlyList<string> FieldIds { get; set; } = [];
    public string? ResultLotId { get; set; }
    public string? Notes { get; set; }
}

public sealed class AllocateOilPressingDto
{
    public List<OilPressingAllocationDto> Allocations { get; set; } = [];
}

public sealed class OilPressingDto
{
    public string Id { get; set; } = string.Empty;
    public string BatchId { get; set; } = string.Empty;
    public string? CampaignId { get; set; }
    public DateTime PressedOn { get; set; }
    public int ResultYear { get; set; }
    public decimal TotalAmount { get; set; }
    public string Unit { get; set; } = "litres";
    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }

    /// <summary>What the farmer takes home once the mill share is off.</summary>
    public decimal FarmerLitres { get; set; }

    public IReadOnlyList<string> FieldIds { get; set; } = [];
    public IReadOnlyList<OilProvenanceEntryDto> Provenance { get; set; } = [];
    public IReadOnlyList<string> HarvestRecordIds { get; set; } = [];

    /// <summary>confirmed | pending_allocation</summary>
    public string Status { get; set; } = "confirmed";

    public string RecordedByUserId { get; set; } = string.Empty;

    /// <summary>Cellars this pressing may be split between. Only filled while it awaits a split.</summary>
    public IReadOnlyList<OilCellarCandidateDto> Candidates { get; set; } = [];

    public string? Notes { get; set; }
    public IReadOnlyList<OilPressingAllocationDto> Allocations { get; set; } = [];

    /// <summary>Lots created for the caller's own cellar from this pressing.</summary>
    public IReadOnlyList<OilLotDto> Lots { get; set; } = [];

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
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
