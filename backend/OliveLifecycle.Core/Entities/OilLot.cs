using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// One pressing / oil ticket the farmer brought home. Physical stock lives here, not per field.
/// </summary>
public class OilLot : BaseEntity
{
    /// <summary>Cellar that holds this lot. Ownership is scoped by this, not by the user mirror.</summary>
    public string CellarId { get; set; } = string.Empty;

    /// <summary>Read-only mirror of the cellar owner, kept for one release while clients migrate.</summary>
    public string OwnerUserId { get; set; } = string.Empty;

    /// <summary>Client/harvest batch id used to group multi-field harvest records.</summary>
    public string BatchId { get; set; } = string.Empty;

    /// <summary>Pressing this lot was allocated from, when it came through the mill flow.</summary>
    public string? SourcePressingId { get; set; }

    public DateTime PressedOn { get; set; } = DateTime.UtcNow;
    public int ResultYear { get; set; }
    public List<string> HarvestRecordIds { get; set; } = [];
    public List<string> FieldIds { get; set; } = [];

    /// <summary>Grove shares summing to ~1. Empty on legacy lots; read through OilProvenance.</summary>
    public List<OilProvenanceEntry> Provenance { get; set; } = [];

    /// <summary>Mill ticket total as recorded (kg or litres).</summary>
    public decimal TotalAmount { get; set; }

    /// <summary><c>kg</c> or <c>litres</c>.</summary>
    public string Unit { get; set; } = "litres";

    public decimal MillKept { get; set; }
    public decimal? ConversionFactor { get; set; }

    /// <summary>What is physically still in the cellar for this lot.</summary>
    public OilPack Packing { get; set; } = OilPack.Empty();

    public string? Notes { get; set; }
}
