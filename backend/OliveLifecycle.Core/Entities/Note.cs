namespace OliveLifecycle.Core.Entities;

/// <summary>
/// Private observation owned by one user. Optional field pin is context only — never shared.
/// User-facing product language: Παρατήρηση / Observation.
/// </summary>
public class Note : BaseEntity
{
    public string OwnerUserId { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? FieldId { get; set; }
    public bool Pinned { get; set; }
    /// <summary>When the observation happened (Chronologio occurredAt).</summary>
    public DateTime OccurredAt { get; set; }
}
