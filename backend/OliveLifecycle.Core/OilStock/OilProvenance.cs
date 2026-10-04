using OliveLifecycle.Core.Entities;

namespace OliveLifecycle.Core.OilStock;

/// <summary>
/// Grove shares for a lot. Older lots only carry <c>FieldIds</c>; those read back as equal shares.
/// </summary>
public static class OilProvenance
{
    /// <summary>Legacy lots have no measured split, so every grove weighs the same.</summary>
    public static List<OilProvenanceEntry> EqualShares(IEnumerable<string>? fieldIds)
    {
        var ids = (fieldIds ?? [])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (ids.Count == 0) return [];

        var share = decimal.Round(1m / ids.Count, 6, MidpointRounding.AwayFromZero);
        var entries = ids
            .Select(id => new OilProvenanceEntry { FieldId = id, Share = share })
            .ToList();
        // Put the rounding remainder on the first grove so the list still sums to 1.
        entries[0].Share += 1m - entries.Sum(e => e.Share);
        return entries;
    }

    /// <summary>Drops blanks, merges duplicates and rescales so shares sum to 1.</summary>
    public static List<OilProvenanceEntry> Normalize(IEnumerable<OilProvenanceEntry>? entries)
    {
        var merged = new List<OilProvenanceEntry>();
        foreach (var entry in entries ?? [])
        {
            if (entry is null || string.IsNullOrWhiteSpace(entry.FieldId)) continue;
            var fieldId = entry.FieldId.Trim();
            var share = Math.Max(0m, entry.Share);
            var existing = merged.FirstOrDefault(e => string.Equals(e.FieldId, fieldId, StringComparison.Ordinal));
            if (existing is null)
            {
                merged.Add(new OilProvenanceEntry { FieldId = fieldId, Share = share });
            }
            else
            {
                existing.Share += share;
            }
        }

        if (merged.Count == 0) return [];

        var total = merged.Sum(e => e.Share);
        if (total <= 0m) return EqualShares(merged.Select(e => e.FieldId));

        foreach (var entry in merged)
        {
            entry.Share = decimal.Round(entry.Share / total, 6, MidpointRounding.AwayFromZero);
        }

        merged[0].Share += 1m - merged.Sum(e => e.Share);
        return merged;
    }

    /// <summary>Stored shares when present, otherwise equal shares from the grove list.</summary>
    public static List<OilProvenanceEntry> Resolve(
        IEnumerable<OilProvenanceEntry>? provenance,
        IEnumerable<string>? fieldIds)
    {
        var normalized = Normalize(provenance);
        return normalized.Count > 0 ? normalized : EqualShares(fieldIds);
    }

    public static List<string> FieldIds(IEnumerable<OilProvenanceEntry>? provenance) =>
        (provenance ?? [])
            .Where(e => e is not null && !string.IsNullOrWhiteSpace(e.FieldId))
            .Select(e => e.FieldId.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();

    /// <summary>Share of a lot attributable to one grove, 0 when the grove is not in the mix.</summary>
    public static decimal ShareFor(
        IEnumerable<OilProvenanceEntry>? provenance,
        IEnumerable<string>? fieldIds,
        string fieldId)
    {
        if (string.IsNullOrWhiteSpace(fieldId)) return 0m;
        return Resolve(provenance, fieldIds)
            .Where(e => string.Equals(e.FieldId, fieldId.Trim(), StringComparison.Ordinal))
            .Sum(e => e.Share);
    }
}
