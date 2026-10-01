namespace OliveLifecycle.Core.Entities;

/// <summary>
/// How much of one lot came from one grove. Shares across a lot sum to ~1.
/// </summary>
public class OilProvenanceEntry
{
    public string FieldId { get; set; } = string.Empty;

    /// <summary>Fraction of the lot from this grove (0..1).</summary>
    public decimal Share { get; set; }
}
