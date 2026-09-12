using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Core.Entities;
using OliveLifecycle.Core.Enums;
using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Application.Services;

public class FieldGeoMatchService : IFieldGeoMatchService
{
    public const double NearestCenterThresholdMetres = 75;

    public FieldGeoMatchResult Match(double latitude, double longitude, IReadOnlyList<Field> accessibleFields)
    {
        var containmentHits = new List<(Field Field, double AreaSqm)>();
        foreach (var field in accessibleFields)
        {
            var ring = field.Boundary?.Coordinates?.FirstOrDefault();
            if (ring == null || ring.Count < 3)
            {
                continue;
            }

            if (GeoMath.IsPointInRing(latitude, longitude, ring))
            {
                var area = field.AppMeasuredAreaSqm
                    ?? (field.Area > 0 ? field.Area * 10_000 : double.MaxValue);
                containmentHits.Add((field, area));
            }
        }

        if (containmentHits.Count == 1)
        {
            var hit = containmentHits[0];
            return new FieldGeoMatchResult
            {
                FieldId = hit.Field.Id,
                Assignment = FieldAssignmentStatus.AutoMatched,
                Score = 1.0,
                Candidates =
                [
                    new FieldMatchCandidate
                    {
                        FieldId = hit.Field.Id,
                        FieldName = hit.Field.Name,
                        Reason = "boundary",
                        Score = 1.0,
                        DistanceMetres = 0
                    }
                ]
            };
        }

        if (containmentHits.Count > 1)
        {
            var ordered = containmentHits.OrderBy(h => h.AreaSqm).ToList();
            var best = ordered[0];
            return new FieldGeoMatchResult
            {
                FieldId = best.Field.Id,
                Assignment = FieldAssignmentStatus.NeedsReview,
                Score = 0.6,
                Candidates = ordered.Select(h => new FieldMatchCandidate
                {
                    FieldId = h.Field.Id,
                    FieldName = h.Field.Name,
                    Reason = "boundaryOverlap",
                    Score = h.AreaSqm <= 0 ? null : 1.0 / h.AreaSqm,
                    DistanceMetres = 0
                }).ToList()
            };
        }

        FieldMatchCandidate? nearest = null;
        foreach (var field in accessibleFields)
        {
            if (!field.TryGetCoordinates(out var fieldLat, out var fieldLng))
            {
                continue;
            }

            var distance = GeoMath.DistanceMetres(latitude, longitude, fieldLat, fieldLng);
            if (distance > NearestCenterThresholdMetres)
            {
                continue;
            }

            if (nearest == null || distance < (nearest.DistanceMetres ?? double.MaxValue))
            {
                nearest = new FieldMatchCandidate
                {
                    FieldId = field.Id,
                    FieldName = field.Name,
                    Reason = "nearestCenter",
                    Score = Math.Max(0, 1 - distance / NearestCenterThresholdMetres),
                    DistanceMetres = distance
                };
            }
        }

        if (nearest != null)
        {
            return new FieldGeoMatchResult
            {
                FieldId = nearest.FieldId,
                Assignment = FieldAssignmentStatus.NeedsReview,
                Score = nearest.Score,
                Candidates = [nearest]
            };
        }

        return new FieldGeoMatchResult
        {
            Assignment = FieldAssignmentStatus.Unassigned,
            Candidates = Array.Empty<FieldMatchCandidate>()
        };
    }
}
