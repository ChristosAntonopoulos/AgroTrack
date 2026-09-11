namespace OliveLifecycle.Core;

/// <summary>
/// Canonical identity of one Chronologio event in the read model.
/// One source record maps to exactly one key, hence exactly one event.
/// </summary>
public readonly record struct ChronologioEventKey(
    string SourceType,
    string SourceId,
    string? OccurrenceId = null)
{
    public string ToId() =>
        string.IsNullOrWhiteSpace(OccurrenceId)
            ? $"{SourceType}:{SourceId}"
            : $"{SourceType}:{SourceId}:{OccurrenceId}";

    public static ChronologioEventKey From(string sourceType, string sourceId, string? occurrenceId = null) =>
        new(
            sourceType ?? string.Empty,
            sourceId ?? string.Empty,
            string.IsNullOrWhiteSpace(occurrenceId) ? null : occurrenceId);
}
