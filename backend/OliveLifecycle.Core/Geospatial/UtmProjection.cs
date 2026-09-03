namespace OliveLifecycle.Core.Geospatial;

/// <summary>
/// Forward and inverse WGS84 / UTM conversion. Sentinel-2 scenes are published in
/// UTM projections (EPSG:326xx north, EPSG:327xx south), so field coordinates must
/// be projected into the scene's zone before they can be turned into pixel indices.
/// Uses the standard Transverse Mercator series, accurate to a few millimetres
/// within a zone, which is far below the 10 m pixel size we work with.
/// </summary>
public static class UtmProjection
{
    private const double SemiMajorAxis = 6378137.0;
    private const double Flattening = 1.0 / 298.257223563;
    private const double ScaleFactor = 0.9996;
    private const double FalseEasting = 500000.0;
    private const double SouthernFalseNorthing = 10000000.0;

    private static readonly double EccentricitySquared = Flattening * (2 - Flattening);
    private static readonly double SecondEccentricitySquared = EccentricitySquared / (1 - EccentricitySquared);

    /// <summary>Returns the UTM zone (1-60) that contains the given longitude.</summary>
    public static int ZoneFromLongitude(double longitude)
    {
        var normalised = ((longitude + 180) % 360 + 360) % 360 - 180;
        return Math.Min(60, (int)Math.Floor((normalised + 180) / 6) + 1);
    }

    /// <summary>Returns the EPSG code of the UTM projection covering the given position.</summary>
    public static int EpsgFromLatLng(double latitude, double longitude)
        => (latitude >= 0 ? 32600 : 32700) + ZoneFromLongitude(longitude);

    /// <summary>Decomposes a UTM EPSG code into its zone and hemisphere. Returns false for non-UTM codes.</summary>
    public static bool TryParseEpsg(int epsg, out int zone, out bool northernHemisphere)
    {
        northernHemisphere = epsg is >= 32601 and <= 32660;
        var southern = epsg is >= 32701 and <= 32760;
        if (!northernHemisphere && !southern)
        {
            zone = 0;
            return false;
        }

        zone = epsg % 100;
        return true;
    }

    public static (double Easting, double Northing) ToUtm(double latitude, double longitude, int zone, bool northernHemisphere)
    {
        var latRad = latitude * Math.PI / 180.0;
        var centralMeridian = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180.0;
        var lngRad = longitude * Math.PI / 180.0;

        var sinLat = Math.Sin(latRad);
        var cosLat = Math.Cos(latRad);
        var tanLat = Math.Tan(latRad);

        var n = SemiMajorAxis / Math.Sqrt(1 - EccentricitySquared * sinLat * sinLat);
        var t = tanLat * tanLat;
        var c = SecondEccentricitySquared * cosLat * cosLat;
        var a = (lngRad - centralMeridian) * cosLat;
        var m = MeridianArc(latRad);

        var a2 = a * a;
        var a3 = a2 * a;
        var a4 = a3 * a;
        var a5 = a4 * a;
        var a6 = a5 * a;

        var easting = ScaleFactor * n * (a
            + (1 - t + c) * a3 / 6
            + (5 - 18 * t + t * t + 72 * c - 58 * SecondEccentricitySquared) * a5 / 120) + FalseEasting;

        var northing = ScaleFactor * (m + n * tanLat * (a2 / 2
            + (5 - t + 9 * c + 4 * c * c) * a4 / 24
            + (61 - 58 * t + t * t + 600 * c - 330 * SecondEccentricitySquared) * a6 / 720));

        if (!northernHemisphere)
        {
            northing += SouthernFalseNorthing;
        }

        return (easting, northing);
    }

    public static (double Latitude, double Longitude) ToLatLng(double easting, double northing, int zone, bool northernHemisphere)
    {
        if (!northernHemisphere)
        {
            northing -= SouthernFalseNorthing;
        }

        var m = northing / ScaleFactor;
        var mu = m / (SemiMajorAxis * (1 - EccentricitySquared / 4 - 3 * Math.Pow(EccentricitySquared, 2) / 64 - 5 * Math.Pow(EccentricitySquared, 3) / 256));
        var e1 = (1 - Math.Sqrt(1 - EccentricitySquared)) / (1 + Math.Sqrt(1 - EccentricitySquared));

        var phi1 = mu
            + (3 * e1 / 2 - 27 * Math.Pow(e1, 3) / 32) * Math.Sin(2 * mu)
            + (21 * e1 * e1 / 16 - 55 * Math.Pow(e1, 4) / 32) * Math.Sin(4 * mu)
            + 151 * Math.Pow(e1, 3) / 96 * Math.Sin(6 * mu)
            + 1097 * Math.Pow(e1, 4) / 512 * Math.Sin(8 * mu);

        var sinPhi1 = Math.Sin(phi1);
        var cosPhi1 = Math.Cos(phi1);
        var tanPhi1 = Math.Tan(phi1);

        var c1 = SecondEccentricitySquared * cosPhi1 * cosPhi1;
        var t1 = tanPhi1 * tanPhi1;
        var n1 = SemiMajorAxis / Math.Sqrt(1 - EccentricitySquared * sinPhi1 * sinPhi1);
        var r1 = SemiMajorAxis * (1 - EccentricitySquared) / Math.Pow(1 - EccentricitySquared * sinPhi1 * sinPhi1, 1.5);
        var d = (easting - FalseEasting) / (n1 * ScaleFactor);

        var d2 = d * d;
        var d3 = d2 * d;
        var d4 = d3 * d;
        var d5 = d4 * d;
        var d6 = d5 * d;

        var latRad = phi1 - n1 * tanPhi1 / r1 * (d2 / 2
            - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * SecondEccentricitySquared) * d4 / 24
            + (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * SecondEccentricitySquared - 3 * c1 * c1) * d6 / 720);

        var lngRad = (d
            - (1 + 2 * t1 + c1) * d3 / 6
            + (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * SecondEccentricitySquared + 24 * t1 * t1) * d5 / 120) / cosPhi1;

        var centralMeridian = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180.0;
        return (latRad * 180.0 / Math.PI, (centralMeridian + lngRad) * 180.0 / Math.PI);
    }

    /// <summary>Meridional arc length from the equator to the given latitude.</summary>
    private static double MeridianArc(double latRad)
    {
        var e2 = EccentricitySquared;
        var e4 = e2 * e2;
        var e6 = e4 * e2;

        return SemiMajorAxis * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * latRad
            - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.Sin(2 * latRad)
            + (15 * e4 / 256 + 45 * e6 / 1024) * Math.Sin(4 * latRad)
            - 35 * e6 / 3072 * Math.Sin(6 * latRad));
    }
}
