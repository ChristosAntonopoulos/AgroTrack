using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Append-only oil stock event. Farmer may never see these; they explain why a balance is what it is.
/// </summary>
public class StockMovement : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;
    public string? OilLotId { get; set; }
    public string? OilCommitmentId { get; set; }
    public StockMovementKind Kind { get; set; }
    public OilPack PackDelta { get; set; } = OilPack.Empty();
    public decimal LitresDelta { get; set; }
    public string? Notes { get; set; }
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;
}
