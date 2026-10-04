using NetTopologySuite.Geometries;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.Units;
using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.Services.Fields;

public class FieldAreaCalculator : IFieldAreaCalculator
{
    private const double EarthRadiusMeters = 6378137.0;

    /// <summary>Reject accidental tiny clicks (≈0.05 stremma).</summary>
    public const double MinAreaSqm = 50d;

    /// <summary>Hard max for a single olive grove (2,000 stremma).</summary>
    public static readonly double MaxAreaSqm = 2_000d * FieldArea.SquareMetresPerStremma;

    /// <summary>Reject polygons whose vertices span more than 50 km.</summary>
    public const double MaxVertexSpanMeters = 50_000d;

    private readonly GeometryFactory _geometryFactory = new(new PrecisionModel(), 4326);

    public FieldAreaResult Calculate(GeoJsonPolygon boundary)
    {
        ValidatePolygon(boundary);
        var ring = boundary.Coordinates[0];
        var areaSqm = CalculateGeodesicAreaSqm(ring);
        var center = CalculateCentroid(ring);

        return new FieldAreaResult
        {
            AreaSqm = areaSqm,
            CenterPoint = new GeoJsonPoint
            {
                Type = "Point",
                Coordinates = new List<double> { center.X, center.Y }
            }
        };
    }

    public void ValidatePolygon(GeoJsonPolygon boundary)
    {
        if (boundary.Coordinates == null || boundary.Coordinates.Count == 0)
        {
            throw new ValidationException("Boundary must include at least one polygon ring.");
        }

        var ring = boundary.Coordinates[0];
        if (ring.Count < 4)
        {
            throw new ValidationException("Boundary polygon must have at least 4 coordinate points including the closing point.");
        }

        if (!IsRingClosed(ring))
        {
            throw new ValidationException("Boundary polygon ring must be closed.");
        }

        var coordinates = ring.Select(c => new Coordinate(c[0], c[1])).ToArray();
        var polygon = _geometryFactory.CreatePolygon(coordinates);
        if (!polygon.IsValid)
        {
            throw new ValidationException("Boundary polygon must not self-intersect.");
        }

        var openCount = ring.Count - 1;
        if (MaxPairwiseHaversineMeters(ring, openCount) > MaxVertexSpanMeters)
        {
            throw new ValidationException("Boundary vertices span too great a distance for a single field.");
        }

        var areaSqm = CalculateGeodesicAreaSqm(ring);
        if (areaSqm < MinAreaSqm)
        {
            throw new ValidationException($"Boundary area must be at least {MinAreaSqm} m².");
        }

        if (areaSqm > MaxAreaSqm)
        {
            throw new ValidationException(
                $"Boundary area exceeds the maximum of {FieldArea.StremmataFromSqm(MaxAreaSqm):0} stremmata for a single field.");
        }
    }

    private static bool IsRingClosed(List<List<double>> ring)
    {
        var first = ring[0];
        var last = ring[^1];
        return Math.Abs(first[0] - last[0]) < 1e-9 && Math.Abs(first[1] - last[1]) < 1e-9;
    }

    private static double MaxPairwiseHaversineMeters(List<List<double>> ring, int openCount)
    {
        double max = 0;
        for (var i = 0; i < openCount; i++)
        {
            for (var j = i + 1; j < openCount; j++)
            {
                var d = HaversineMeters(ring[i][1], ring[i][0], ring[j][1], ring[j][0]);
                if (d > max) max = d;
            }
        }

        return max;
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * EarthRadiusMeters * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    private static double ToRad(double degrees) => degrees * Math.PI / 180.0;

    private static double CalculateGeodesicAreaSqm(List<List<double>> ring)
    {
        var rad = Math.PI / 180.0;
        double total = 0;

        for (var i = 0; i < ring.Count - 1; i++)
        {
            var p1 = ring[i];
            var p2 = ring[i + 1];
            var lon1 = p1[0] * rad;
            var lon2 = p2[0] * rad;
            var lat1 = p1[1] * rad;
            var lat2 = p2[1] * rad;
            total += (lon2 - lon1) * (2 + Math.Sin(lat1) + Math.Sin(lat2));
        }

        return Math.Abs(total * EarthRadiusMeters * EarthRadiusMeters / 2.0);
    }

    private static Coordinate CalculateCentroid(List<List<double>> ring)
    {
        var count = ring.Count - 1;
        if (count <= 0)
        {
            return new Coordinate(0, 0);
        }

        var sumLon = ring.Take(count).Sum(p => p[0]);
        var sumLat = ring.Take(count).Sum(p => p[1]);
        return new Coordinate(sumLon / count, sumLat / count);
    }
}
