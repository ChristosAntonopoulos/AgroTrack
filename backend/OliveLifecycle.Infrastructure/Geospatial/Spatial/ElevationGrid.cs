using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Core.ValueObjects.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Spatial;

/// <summary>
/// A regular latitude/longitude sampling grid over a field boundary, used to turn
/// point elevation lookups into slope, aspect and terrain zones.
///
/// The grid deliberately covers the whole bounding box (not only interior points)
/// so that cells on the boundary still have the neighbours a 3x3 kernel needs.
/// </summary>
public class ElevationGrid
{
    private readonly List<List<double>> _ring;
    private readonly double[,] _elevations;
    private readonly bool[,] _hasValue;
    private readonly bool[,] _inside;

    private ElevationGrid(List<List<double>> ring, int rows, int columns, double minLat, double minLng, double latStep, double lngStep)
    {
        _ring = ring;
        Rows = rows;
        Columns = columns;
        MinLat = minLat;
        MinLng = minLng;
        LatStep = latStep;
        LngStep = lngStep;
        _elevations = new double[rows, columns];
        _hasValue = new bool[rows, columns];
        _inside = new bool[rows, columns];

        var points = new List<(double Lat, double Lng)>(rows * columns);
        for (var row = 0; row < rows; row++)
        {
            for (var column = 0; column < columns; column++)
            {
                var lat = LatAt(row);
                var lng = LngAt(column);
                _inside[row, column] = GeoMath.IsPointInRing(lat, lng, ring);
                points.Add((lat, lng));
            }
        }
        AllPoints = points;
    }

    public int Rows { get; }
    public int Columns { get; }
    public double MinLat { get; }
    public double MinLng { get; }
    public double LatStep { get; }
    public double LngStep { get; }

    /// <summary>Grid nodes in row-major order, matching the order elevations must be supplied in.</summary>
    public IReadOnlyList<(double Lat, double Lng)> AllPoints { get; }

    public static ElevationGrid? Build(GeoJsonPolygon boundary, int gridSize)
    {
        if (boundary.Coordinates.Count == 0) return null;
        var ring = boundary.Coordinates[0];
        if (ring.Count < 4) return null;

        var bbox = GeoMath.BoundingBox(boundary);
        double minLng = bbox[0], minLat = bbox[1], maxLng = bbox[2], maxLat = bbox[3];
        if (maxLat <= minLat || maxLng <= minLng) return null;

        var size = Math.Max(gridSize, 3);
        var latStep = (maxLat - minLat) / (size - 1);
        var lngStep = (maxLng - minLng) / (size - 1);
        return new ElevationGrid(ring, size, size, minLat, minLng, latStep, lngStep);
    }

    public double LatAt(int row) => MinLat + LatStep * row;

    public double LngAt(int column) => MinLng + LngStep * column;

    public void SetElevations(IReadOnlyList<double?> elevations)
    {
        for (var index = 0; index < elevations.Count && index < Rows * Columns; index++)
        {
            var row = index / Columns;
            var column = index % Columns;
            if (elevations[index].HasValue)
            {
                _elevations[row, column] = elevations[index]!.Value;
                _hasValue[row, column] = true;
            }
        }
    }

    public TerrainSummary Summarize(SlopeClassificationOptions slopeOptions)
    {
        var interiorElevations = new List<double>();
        var slopePercents = new List<double>();
        var zoneCounts = new Dictionary<string, int>();

        // Downhill gradient components, summed so the field's overall aspect is the
        // vector mean rather than whichever single cell happens to be steepest.
        var downhillNorth = 0.0;
        var downhillEast = 0.0;

        // Metres per degree at this latitude; longitude spacing shrinks toward the poles.
        var centreLat = LatAt(Rows / 2);
        var cellHeightM = GeoMath.DistanceMetres(centreLat, LngAt(0), centreLat + LatStep, LngAt(0));
        var cellWidthM = GeoMath.DistanceMetres(centreLat, LngAt(0), centreLat, LngAt(0) + LngStep);
        if (cellHeightM <= 0 || cellWidthM <= 0) return new TerrainSummary();

        for (var row = 0; row < Rows; row++)
        {
            for (var column = 0; column < Columns; column++)
            {
                if (!_inside[row, column] || !_hasValue[row, column]) continue;

                interiorElevations.Add(_elevations[row, column]);

                var gradient = ComputeGradient(row, column, cellWidthM, cellHeightM);
                if (gradient == null) continue;

                var (dzdx, dzdy) = gradient.Value;
                var slopePercent = Math.Sqrt(dzdx * dzdx + dzdy * dzdy) * 100;
                slopePercents.Add(slopePercent);

                var zone = ClassifySlope(slopePercent, slopeOptions);
                zoneCounts[zone] = zoneCounts.GetValueOrDefault(zone) + 1;

                // Aspect faces downhill, which is the negative of the rising gradient.
                downhillNorth -= dzdy;
                downhillEast -= dzdx;
            }
        }

        if (interiorElevations.Count == 0)
        {
            return new TerrainSummary { SampleCount = 0 };
        }

        interiorElevations.Sort();
        var totalZoneCells = zoneCounts.Values.Sum();

        return new TerrainSummary
        {
            SampleCount = interiorElevations.Count,
            MinElevationM = Math.Round(interiorElevations[0], 1),
            MaxElevationM = Math.Round(interiorElevations[^1], 1),
            AverageElevationM = Math.Round(interiorElevations.Average(), 1),
            MedianElevationM = Math.Round(Median(interiorElevations), 1),
            ElevationRangeM = Math.Round(interiorElevations[^1] - interiorElevations[0], 1),
            AverageSlopePercent = slopePercents.Count > 0 ? Math.Round(slopePercents.Average(), 1) : null,
            MaxSlopePercent = slopePercents.Count > 0 ? Math.Round(slopePercents.Max(), 1) : null,
            AverageSlopeDegrees = slopePercents.Count > 0 ? Math.Round(ToDegrees(slopePercents.Average()), 1) : null,
            MaxSlopeDegrees = slopePercents.Count > 0 ? Math.Round(ToDegrees(slopePercents.Max()), 1) : null,
            DominantAspect = ResolveAspect(downhillNorth, downhillEast),
            DominantSlopeClass = zoneCounts.Count > 0
                ? zoneCounts.OrderByDescending(z => z.Value).First().Key
                : null,
            SlopeZonePercent = totalZoneCells > 0
                ? zoneCounts.ToDictionary(z => z.Key, z => Math.Round(z.Value * 100.0 / totalZoneCells, 1))
                : new Dictionary<string, double>()
        };
    }

    /// <summary>
    /// Horn's method: a 3x3 weighted difference of neighbouring elevations. Returns
    /// null when a neighbour is missing, because a one-sided difference would
    /// exaggerate slope at the grid edge.
    /// </summary>
    private (double DzDx, double DzDy)? ComputeGradient(int row, int column, double cellWidthM, double cellHeightM)
    {
        if (row == 0 || column == 0 || row == Rows - 1 || column == Columns - 1) return null;

        for (var r = row - 1; r <= row + 1; r++)
        {
            for (var c = column - 1; c <= column + 1; c++)
            {
                if (!_hasValue[r, c]) return null;
            }
        }

        double E(int r, int c) => _elevations[r, c];

        var dzdx = ((E(row - 1, column + 1) + 2 * E(row, column + 1) + E(row + 1, column + 1)) -
                    (E(row - 1, column - 1) + 2 * E(row, column - 1) + E(row + 1, column - 1)))
                   / (8 * cellWidthM);

        var dzdy = ((E(row + 1, column - 1) + 2 * E(row + 1, column) + E(row + 1, column + 1)) -
                    (E(row - 1, column - 1) + 2 * E(row - 1, column) + E(row - 1, column + 1)))
                   / (8 * cellHeightM);

        return (dzdx, dzdy);
    }

    /// <summary>
    /// Converts a downhill (north, east) vector to a compass point. Returns null for
    /// terrain with no measurable fall, where any aspect would be invented.
    /// </summary>
    private static string? ResolveAspect(double north, double east)
    {
        if (Math.Abs(north) < 1e-9 && Math.Abs(east) < 1e-9) return null;
        return GeoMath.ToCompass(Math.Atan2(east, north) * 180 / Math.PI);
    }

    private static string ClassifySlope(double slopePercent, SlopeClassificationOptions options)
    {
        if (slopePercent <= options.FlatMaxPercent) return "Flat";
        if (slopePercent <= options.ModerateMaxPercent) return "Moderate";
        if (slopePercent <= options.SteepMaxPercent) return "Steep";
        return "Very steep";
    }

    private static double ToDegrees(double slopePercent) => Math.Atan(slopePercent / 100) * 180 / Math.PI;

    private static double Median(List<double> sorted) => sorted.Count % 2 == 1
        ? sorted[sorted.Count / 2]
        : (sorted[sorted.Count / 2 - 1] + sorted[sorted.Count / 2]) / 2;
}
