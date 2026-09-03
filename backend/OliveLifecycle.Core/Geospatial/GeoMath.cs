using OliveLifecycle.Core.ValueObjects;

namespace OliveLifecycle.Core.Geospatial;

/// <summary>
/// Geodesic helpers shared by the geospatial providers. Distances use a spherical
/// earth model, which is accurate to well under a metre at field scale.
/// </summary>
public static class GeoMath
{
    private const double EarthRadiusMetres = 6_371_008.8;

    private static readonly string[] CompassPoints = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

    public static double DistanceMetres(double lat1, double lng1, double lat2, double lng2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLng = ToRadians(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return EarthRadiusMetres * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public static double DistanceKm(double lat1, double lng1, double lat2, double lng2)
        => DistanceMetres(lat1, lng1, lat2, lng2) / 1000;

    public static double BearingDegrees(double lat1, double lng1, double lat2, double lng2)
    {
        var dLng = ToRadians(lng2 - lng1);
        var y = Math.Sin(dLng) * Math.Cos(ToRadians(lat2));
        var x = Math.Cos(ToRadians(lat1)) * Math.Sin(ToRadians(lat2)) -
                Math.Sin(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Cos(dLng);
        return (Math.Atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    public static string ToCompass(double degrees)
        => CompassPoints[(int)Math.Round(((degrees % 360) + 360) % 360 / 45) % 8];

    /// <summary>
    /// Shortest distance from a point to a line segment. Uses a local equirectangular
    /// projection about the point, which is accurate over the tens of kilometres this
    /// is used for and avoids overestimating distance across long polygon edges.
    /// </summary>
    public static double DistanceToSegmentKm(
        double lat, double lng,
        double lat1, double lng1,
        double lat2, double lng2)
    {
        var lngScale = Math.Cos(ToRadians(lat));

        // Project onto a flat plane in degrees centred on the point, with longitude
        // compressed by latitude, so the point itself sits at the origin.
        var ax = (lng1 - lng) * lngScale;
        var ay = lat1 - lat;
        var bx = (lng2 - lng) * lngScale;
        var by = lat2 - lat;

        var dx = bx - ax;
        var dy = by - ay;
        var lengthSquared = dx * dx + dy * dy;

        double closestLat, closestLng;
        if (lengthSquared < 1e-18)
        {
            closestLat = lat1;
            closestLng = lng1;
        }
        else
        {
            // Clamped projection parameter keeps the closest point on the segment.
            var t = Math.Clamp((-ax * dx - ay * dy) / lengthSquared, 0, 1);
            closestLat = lat1 + (lat2 - lat1) * t;
            closestLng = lng1 + (lng2 - lng1) * t;
        }

        return DistanceKm(lat, lng, closestLat, closestLng);
    }

    /// <summary>Shortest distance from a point to a closed ring's boundary.</summary>
    public static double DistanceToRingKm(double lat, double lng, List<List<double>> ring)
    {
        var shortest = double.MaxValue;
        for (var i = 0; i < ring.Count - 1; i++)
        {
            if (ring[i].Count < 2 || ring[i + 1].Count < 2) continue;
            var distance = DistanceToSegmentKm(lat, lng, ring[i][1], ring[i][0], ring[i + 1][1], ring[i + 1][0]);
            if (distance < shortest) shortest = distance;
        }
        return shortest;
    }

    /// <summary>Ray-casting containment test on the polygon's outer ring.</summary>
    public static bool IsPointInRing(double lat, double lng, List<List<double>> ring)
    {
        var inside = false;
        for (int i = 0, j = ring.Count - 1; i < ring.Count; j = i++)
        {
            double xi = ring[i][0], yi = ring[i][1];
            double xj = ring[j][0], yj = ring[j][1];
            if ((yi > lat) != (yj > lat) &&
                lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
            {
                inside = !inside;
            }
        }
        return inside;
    }

    /// <summary>Returns [minLng, minLat, maxLng, maxLat].</summary>
    public static double[] BoundingBox(GeoJsonPolygon polygon)
    {
        var ring = polygon.Coordinates[0];
        return
        [
            ring.Min(c => c[0]),
            ring.Min(c => c[1]),
            ring.Max(c => c[0]),
            ring.Max(c => c[1])
        ];
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
