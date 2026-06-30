using NetTopologySuite.Geometries;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Core.Exceptions;
using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Application.Services.Fields;

public class FieldAreaCalculator : IFieldAreaCalculator
{
    private const double EarthRadiusMeters = 6378137.0;
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

        var areaSqm = CalculateGeodesicAreaSqm(ring);
        if (areaSqm <= 1)
        {
            throw new ValidationException("Boundary area must be greater than 1 m².");
        }
    }

    private static bool IsRingClosed(List<List<double>> ring)
    {
        var first = ring[0];
        var last = ring[^1];
        return Math.Abs(first[0] - last[0]) < 1e-9 && Math.Abs(first[1] - last[1]) < 1e-9;
    }

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
