namespace OliveLifecycle.Core.Entities;

/// <summary>
/// One mill ticket. The pressing is the physical event; the oil itself lands in one or more
/// cellars through <see cref="PressingAllocation"/>, so a shared press is recorded once.
/// </summary>
public class OilPressing : BaseEntity
{
    public string? CampaignId { get; set; }

    /// <summary>Client/harvest batch id shared with the lots created from this pressing.</summary>
    public string BatchId { get; set; } = string.Empty;

    public DateTime PressedOn { get; set; } = DateTime.UtcNow;
    public int ResultYear { get; set; }

    /// <summary>Mill ticket total as recorded, in <see cref="Unit"/>.</summary>
    public decimal TotalLitres { get; set; }

    /// <summary><c>kg</c> or <c>litres</c>.</summary>
    public string Unit { get; set; } = "litres";

    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }

    public List<string> FieldIds { get; set; } = [];
    public List<OilProvenanceEntry> Provenance { get; set; } = [];

    public string RecordedByUserId { get; set; } = string.Empty;

    /// <summary>confirmed | pending_allocation</summary>
    public string Status { get; set; } = OilPressingStatuses.Confirmed;

    public List<string> HarvestRecordIds { get; set; } = [];
    public string? Notes { get; set; }

    /// <summary>Who takes home how much of this pressing.</summary>
    public List<PressingAllocation> Allocations { get; set; } = [];
}

/// <summary>A slice of one pressing that goes into a single cellar.</summary>
public class PressingAllocation
{
    public string PressingId { get; set; } = string.Empty;
    public string CellarId { get; set; } = string.Empty;
    public decimal Litres { get; set; }
    public string AllocatedBy { get; set; } = string.Empty;
    public DateTime AllocatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Lot created for this slice, set once the allocation is materialised.</summary>
    public string? OilLotId { get; set; }
}

public static class OilPressingStatuses
{
    public const string Confirmed = "confirmed";
    public const string PendingAllocation = "pending_allocation";
}
