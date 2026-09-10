namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Idempotent proposal identity: one active/snoozed proposal per field/template/reason/window.
/// </summary>
public static class ProposalDedupKey
{
    public static string Build(
        string fieldId,
        string templateCode,
        string reasonCode,
        DateTime? windowStart,
        DateTime? windowEnd)
    {
        var start = windowStart?.ToUniversalTime().ToString("yyyy-MM-dd") ?? "-";
        var end = windowEnd?.ToUniversalTime().ToString("yyyy-MM-dd") ?? "-";
        return $"{fieldId.Trim()}|{templateCode.Trim().ToUpperInvariant()}|{reasonCode.Trim().ToUpperInvariant()}|{start}|{end}";
    }
}
