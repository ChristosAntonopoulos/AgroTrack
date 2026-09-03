using OliveLifecycle.Core.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using Xunit;

namespace OliveLifecycle.Application.Tests.Geospatial;

public class GeoMathTests
{
    private static GeoJsonPolygon Square() => new()
    {
        Coordinates =
        [
            [
                [23.700, 37.900],
                [23.710, 37.900],
                [23.710, 37.910],
                [23.700, 37.910],
                [23.700, 37.900]
            ]
        ]
    };

    [Fact]
    public void DistanceKm_MatchesKnownSeparation()
    {
        // Athens to Thessaloniki is ~300 km great-circle.
        var distance = GeoMath.DistanceKm(37.9838, 23.7275, 40.6401, 22.9444);

        Assert.InRange(distance, 295, 305);
    }

    [Fact]
    public void DistanceKm_IsZeroForSamePoint()
    {
        Assert.Equal(0, GeoMath.DistanceKm(37.9838, 23.7275, 37.9838, 23.7275), 6);
    }

    [Theory]
    [InlineData(0, "N")]
    [InlineData(45, "NE")]
    [InlineData(90, "E")]
    [InlineData(180, "S")]
    [InlineData(270, "W")]
    [InlineData(359, "N")]
    [InlineData(-90, "W")]
    public void ToCompass_WrapsAroundTheFullCircle(double degrees, string expected)
    {
        Assert.Equal(expected, GeoMath.ToCompass(degrees));
    }

    [Fact]
    public void BearingDegrees_PointsEastForAnEastwardMove()
    {
        var bearing = GeoMath.BearingDegrees(37.90, 23.70, 37.90, 23.75);

        Assert.InRange(bearing, 89, 91);
    }

    [Fact]
    public void IsPointInRing_DetectsInteriorAndExteriorPoints()
    {
        var ring = Square().Coordinates[0];

        Assert.True(GeoMath.IsPointInRing(37.905, 23.705, ring));
        Assert.False(GeoMath.IsPointInRing(37.905, 23.750, ring));
        Assert.False(GeoMath.IsPointInRing(37.950, 23.705, ring));
    }

    [Fact]
    public void DistanceToSegmentKm_MeasuresPerpendicularlyToTheEdge()
    {
        // Point due north of the middle of a long east-west segment.
        var distance = GeoMath.DistanceToSegmentKm(37.90, 23.70, 37.80, 23.40, 37.80, 24.00);

        // 0.1 degrees of latitude is ~11.1 km.
        Assert.InRange(distance, 10.5, 11.5);
    }

    [Fact]
    public void DistanceToSegmentKm_ClampsToTheSegmentEndpoints()
    {
        // Point beyond the eastern end of the segment: nearest point is that endpoint.
        var distance = GeoMath.DistanceToSegmentKm(37.80, 24.50, 37.80, 23.40, 37.80, 24.00);
        var toEndpoint = GeoMath.DistanceKm(37.80, 24.50, 37.80, 24.00);

        Assert.Equal(toEndpoint, distance, 3);
    }

    [Fact]
    public void DistanceToSegmentKm_HandlesZeroLengthSegments()
    {
        var distance = GeoMath.DistanceToSegmentKm(37.90, 23.70, 37.80, 23.70, 37.80, 23.70);

        Assert.Equal(GeoMath.DistanceKm(37.90, 23.70, 37.80, 23.70), distance, 3);
    }

    [Fact]
    public void DistanceToRingKm_IsShorterThanTheNearestVertex()
    {
        // Square with long edges: the nearest edge point is much closer than any corner.
        var ring = new List<List<double>>
        {
            new() { 23.40, 37.20 },
            new() { 24.00, 37.20 },
            new() { 24.00, 37.80 },
            new() { 23.40, 37.80 },
            new() { 23.40, 37.20 }
        };

        var toRing = GeoMath.DistanceToRingKm(37.90, 23.70, ring);
        var toNearestVertex = ring.Min(v => GeoMath.DistanceKm(37.90, 23.70, v[1], v[0]));

        Assert.InRange(toRing, 10.5, 11.5);
        Assert.True(toRing < toNearestVertex);
    }

    [Fact]
    public void BoundingBox_ReturnsLngLatOrder()
    {
        var bbox = GeoMath.BoundingBox(Square());

        Assert.Equal(23.700, bbox[0], 6);
        Assert.Equal(37.900, bbox[1], 6);
        Assert.Equal(23.710, bbox[2], 6);
        Assert.Equal(37.910, bbox[3], 6);
    }
}
