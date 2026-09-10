using OliveLifecycle.Core.Entities.FieldWork;
using OliveLifecycle.Core.Enums;

namespace OliveLifecycle.Core.FieldWork;

/// <summary>
/// Resolves the current field phenology. User/agronomist observations override
/// system estimates. Month alone never invents a stage.
/// </summary>
public static class PhenologyResolver
{
    public static FieldPhenologySnapshot Resolve(IReadOnlyList<FieldPhenologyObservation> observations)
    {
        if (observations.Count == 0)
        {
            return FieldPhenologySnapshot.Unknown();
        }

        var ordered = observations
            .OrderByDescending(o => o.Source.OverridesSystemEstimate())
            .ThenByDescending(o => o.ObservedOn)
            .ThenByDescending(o => o.CreatedAt)
            .ToList();

        var preferred = ordered.FirstOrDefault(o => o.Source.OverridesSystemEstimate())
            ?? ordered.First();

        if (preferred.StageCode == OliveBbchStage.Unknown)
        {
            return FieldPhenologySnapshot.Unknown(preferred);
        }

        return new FieldPhenologySnapshot
        {
            StageCode = preferred.StageCode,
            ObservedOn = preferred.ObservedOn,
            Source = preferred.Source,
            Confidence = preferred.Confidence,
            ObservationId = preferred.Id,
            IsKnown = true,
            PhotoIds = preferred.PhotoIds.ToList(),
            Notes = preferred.Notes
        };
    }
}

public sealed class FieldPhenologySnapshot
{
    public OliveBbchStage StageCode { get; init; } = OliveBbchStage.Unknown;
    public DateTime? ObservedOn { get; init; }
    public PhenologySource? Source { get; init; }
    public ProposalConfidence? Confidence { get; init; }
    public string? ObservationId { get; init; }
    public bool IsKnown { get; init; }
    public List<string> PhotoIds { get; init; } = [];
    public string? Notes { get; init; }

    public static FieldPhenologySnapshot Unknown(FieldPhenologyObservation? observation = null) => new()
    {
        StageCode = OliveBbchStage.Unknown,
        ObservedOn = observation?.ObservedOn,
        Source = observation?.Source,
        Confidence = observation?.Confidence,
        ObservationId = observation?.Id,
        IsKnown = false,
        PhotoIds = observation?.PhotoIds.ToList() ?? [],
        Notes = observation?.Notes
    };
}
