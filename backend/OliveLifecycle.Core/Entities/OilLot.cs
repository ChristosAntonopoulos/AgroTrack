using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// One pressing / oil ticket the farmer brought home. Physical stock lives here, not per field.
/// </summary>
public class OilLot : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;

    /// <summary>Client/harvest batch id used to group multi-field harvest records.</summary>
    public string BatchId { get; set; } = string.Empty;

    public DateTime PressedOn { get; set; } = DateTime.UtcNow;
    public int ResultYear { get; set; }
    public List<string> HarvestRecordIds { get; set; } = [];
    public List<string> FieldIds { get; set; } = [];

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
