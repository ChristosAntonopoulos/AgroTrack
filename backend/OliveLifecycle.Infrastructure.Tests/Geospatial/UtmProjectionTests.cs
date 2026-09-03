using OliveLifecycle.Core.Geospatial;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class UtmProjectionTests
{
    [Theory]
    [InlineData(22.5, 34)]   // Southern Greece, where the olive fields are
    [InlineData(-179.9, 1)]
    [InlineData(179.9, 60)]
    [InlineData(0.0, 31)]
    [InlineData(-0.1, 30)]
    public void ZoneFromLongitude_MatchesTheStandardGrid(double longitude, int expectedZone)
    {
        Assert.Equal(expectedZone, UtmProjection.ZoneFromLongitude(longitude));
    }

    [Fact]
    public void EpsgFromLatLng_DistinguishesHemispheres()
    {
        Assert.Equal(32634, UtmProjection.EpsgFromLatLng(37.9, 22.5));
        Assert.Equal(32734, UtmProjection.EpsgFromLatLng(-37.9, 22.5));
    }

    [Theory]
    [InlineData(32634, 34, true)]
    [InlineData(32734, 34, false)]
    [InlineData(32601, 1, true)]
    [InlineData(32660, 60, true)]
    [InlineData(32760, 60, false)]
    public void TryParseEpsg_DecomposesUtmCodes(int epsg, int expectedZone, bool expectedNorthern)
    {
        Assert.True(UtmProjection.TryParseEpsg(epsg, out var zone, out var northern));
        Assert.Equal(expectedZone, zone);
        Assert.Equal(expectedNorthern, northern);
    }

    [Theory]
    [InlineData(4326)]
    [InlineData(3857)]
    [InlineData(32661)]
    public void TryParseEpsg_RejectsNonUtmCodes(int epsg)
    {
        Assert.False(UtmProjection.TryParseEpsg(epsg, out _, out _));
    }

    [Theory]
    [InlineData(37.9838, 23.7275)]  // Athens
    [InlineData(35.3387, 25.1442)]  // Crete
    [InlineData(-33.8688, 151.2093)] // Southern hemisphere
    [InlineData(0.0, 22.5)]          // Equator
    public void ToUtm_RoundTripsToTheSameCoordinate(double latitude, double longitude)
    {
        var zone = UtmProjection.ZoneFromLongitude(longitude);
        var northern = latitude >= 0;

        var (easting, northing) = UtmProjection.ToUtm(latitude, longitude, zone, northern);
        var (roundTripLat, roundTripLng) = UtmProjection.ToLatLng(easting, northing, zone, northern);

        // A tenth of a microdegree is roughly a centimetre, far below the 10 m pixels.
        Assert.Equal(latitude, roundTripLat, 7);
        Assert.Equal(longitude, roundTripLng, 7);
    }

    [Fact]
    public void ToUtm_PlacesTheCentralMeridianAtTheFalseEasting()
    {
        var (easting, _) = UtmProjection.ToUtm(37.9, 21.0, 34, true);

        // Zone 34's central meridian is 21°E.
        Assert.Equal(500000, easting, 3);
    }

    [Fact]
    public void ToUtm_MeasuresNorthingFromTheEquator()
    {
        var (_, northing) = UtmProjection.ToUtm(0, 21.0, 34, true);
        Assert.Equal(0, northing, 3);
    }

    [Fact]
    public void ToUtm_OffsetsSouthernHemisphereNorthings()
    {
        var (_, northing) = UtmProjection.ToUtm(-0.001, 21.0, 34, false);

        // Southern coordinates are shifted so they stay positive.
        Assert.InRange(northing, 9_999_800, 10_000_000);
    }

    [Fact]
    public void ToUtm_PreservesGroundDistanceAlongTheCentralMeridian()
    {
        var (easting1, northing1) = UtmProjection.ToUtm(37.90, 21.0, 34, true);
        var (easting2, northing2) = UtmProjection.ToUtm(37.91, 21.0, 34, true);

        var projected = Math.Sqrt(Math.Pow(easting2 - easting1, 2) + Math.Pow(northing2 - northing1, 2));

        // Expected length of a 0.01 degree meridian arc on the WGS84 ellipsoid,
        // scaled by the UTM central meridian factor. GeoMath is deliberately not
        // used here: its spherical model differs from the ellipsoid by about 0.2%,
        // which is larger than the tolerance this check is meant to enforce.
        const double SemiMajorAxis = 6378137.0;
        const double EccentricitySquared = 0.00669437999014;
        var latitude = 37.905 * Math.PI / 180;
        var meridionalRadius = SemiMajorAxis * (1 - EccentricitySquared)
            / Math.Pow(1 - EccentricitySquared * Math.Pow(Math.Sin(latitude), 2), 1.5);
        var expected = meridionalRadius * 0.01 * Math.PI / 180 * 0.9996;

        Assert.Equal(expected, projected, 1);
    }

    [Fact]
    public void ToUtm_AgreesWithGeodesicDistanceToWithinTheEllipsoidalDifference()
    {
        var (easting1, northing1) = UtmProjection.ToUtm(37.90, 21.0, 34, true);
        var (easting2, northing2) = UtmProjection.ToUtm(37.90, 21.01, 34, true);

        var projected = Math.Sqrt(Math.Pow(easting2 - easting1, 2) + Math.Pow(northing2 - northing1, 2));
        var geodesic = GeoMath.DistanceMetres(37.90, 21.0, 37.90, 21.01);

        Assert.Equal(geodesic, projected, geodesic * 0.005);
    }
}
