using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.OilStock;

namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Append-only oil stock event. Farmer may never see these; they explain why a balance is what it is.
/// </summary>
public class StockMovement : BaseEntity
{
    /// <summary>Cellar this movement belongs to.</summary>
    public string CellarId { get; set; } = string.Empty;

    /// <summary>Read-only mirror of the cellar owner, kept for one release while clients migrate.</summary>
    public string OwnerUserId { get; set; } = string.Empty;
    public string? OilLotId { get; set; }
    public string? OilCommitmentId { get; set; }
    public StockMovementKind Kind { get; set; }
    public OilPack PackDelta { get; set; } = OilPack.Empty();
    public decimal LitresDelta { get; set; }

    /// <summary>Shared by the two legs of one transfer (shared_out + shared_in).</summary>
    public string? TransferId { get; set; }

    /// <summary>Set when this movement undoes an earlier one.</summary>
    public string? ReversalOfMovementId { get; set; }

    public string? Notes { get; set; }
    public DateTime OccurredOn { get; set; } = DateTime.UtcNow;
}
