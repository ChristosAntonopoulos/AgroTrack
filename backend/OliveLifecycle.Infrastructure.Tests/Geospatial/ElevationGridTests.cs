using OliveLifecycle.Application.Configuration.Geospatial;
using OliveLifecycle.Core.ValueObjects;
using OliveLifecycle.Infrastructure.Geospatial.Spatial;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class ElevationGridTests
{
    private static readonly SlopeClassificationOptions SlopeOptions = new();

    /// <summary>A square roughly 1.1 km on each side near Athens.</summary>
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
    public void Build_ReturnsNullForDegenerateBoundary()
    {
        Assert.Null(ElevationGrid.Build(new GeoJsonPolygon(), 11));
        Assert.Null(ElevationGrid.Build(new GeoJsonPolygon { Coordinates = [[[23.7, 37.9], [23.7, 37.9]]] }, 11));
    }

    [Fact]
    public void Build_ProducesAFullGridOfSamplePoints()
    {
        var grid = ElevationGrid.Build(Square(), 11);

        Assert.NotNull(grid);
        Assert.Equal(11, grid!.Rows);
        Assert.Equal(11, grid.Columns);
        Assert.Equal(121, grid.AllPoints.Count);
    }

    [Fact]
    public void Build_CoversTheWholeBoundingBox()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;

        Assert.Equal(37.900, grid.AllPoints.Min(p => p.Lat), 5);
        Assert.Equal(37.910, grid.AllPoints.Max(p => p.Lat), 5);
        Assert.Equal(23.700, grid.AllPoints.Min(p => p.Lng), 5);
        Assert.Equal(23.710, grid.AllPoints.Max(p => p.Lng), 5);
    }

    [Fact]
    public void Summarize_ReportsFlatTerrainForAConstantSurface()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        grid.SetElevations(Enumerable.Repeat((double?)250, grid.AllPoints.Count).ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.Equal(250, summary.MinElevationM);
        Assert.Equal(250, summary.MaxElevationM);
        Assert.Equal(250, summary.AverageElevationM);
        Assert.Equal(0, summary.ElevationRangeM);
        Assert.Equal(0, summary.AverageSlopePercent);
        Assert.Equal("Flat", summary.DominantSlopeClass);
        // A perfectly flat surface has no downhill direction to report.
        Assert.Null(summary.DominantAspect);
    }

    [Fact]
    public void Summarize_ComputesSlopeForAKnownUniformGradient()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        // Rise 10 m per grid row northwards. Row spacing is ~111 m, so slope ~9%.
        var elevations = grid.AllPoints
            .Select((_, index) => (double?)(100 + index / grid.Columns * 10))
            .ToList();
        grid.SetElevations(elevations);

        var summary = grid.Summarize(SlopeOptions);

        Assert.InRange(summary.AverageSlopePercent!.Value, 8, 10);
        Assert.Equal("Moderate", summary.DominantSlopeClass);
    }

    [Fact]
    public void Summarize_ReportsAspectDownhillNotUphill()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        // Terrain rises to the north, so water runs south: aspect must be S.
        grid.SetElevations(grid.AllPoints
            .Select((_, index) => (double?)(100 + index / grid.Columns * 10))
            .ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.Equal("S", summary.DominantAspect);
    }

    [Fact]
    public void Summarize_ReportsEastAspectForAWestwardRise()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        // High in the west (low column index), so the slope faces east.
        grid.SetElevations(grid.AllPoints
            .Select((_, index) => (double?)(200 - index % grid.Columns * 10))
            .ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.Equal("E", summary.DominantAspect);
    }

    [Fact]
    public void Summarize_SplitsMixedTerrainIntoZones()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        // Flat southern half, steeply rising northern half.
        grid.SetElevations(grid.AllPoints
            .Select((_, index) =>
            {
                var row = index / grid.Columns;
                return (double?)(row < 5 ? 100 : 100 + (row - 4) * 40);
            })
            .ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.True(summary.SlopeZonePercent.Count > 1, "Mixed terrain should span more than one slope class");
        Assert.Equal(100, summary.SlopeZonePercent.Values.Sum(), 1);
    }

    [Fact]
    public void Summarize_ReportsSampleCountForConfidence()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        grid.SetElevations(Enumerable.Repeat((double?)250, grid.AllPoints.Count).ToList());

        var summary = grid.Summarize(SlopeOptions);

        // Only nodes inside the boundary count; corner nodes sit exactly on the edge.
        Assert.InRange(summary.SampleCount, 80, 121);
    }

    [Fact]
    public void Summarize_ReturnsNothingWhenAllElevationsAreMissing()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        grid.SetElevations(Enumerable.Repeat((double?)null, grid.AllPoints.Count).ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.Equal(0, summary.SampleCount);
        Assert.Null(summary.AverageElevationM);
        Assert.Null(summary.AverageSlopePercent);
    }

    [Fact]
    public void Summarize_SkipsSlopeWhereNeighboursAreMissing()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        // Elevation known only on the first row: no cell has a complete 3x3 window.
        grid.SetElevations(grid.AllPoints
            .Select((_, index) => index < grid.Columns ? (double?)100 : null)
            .ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.Null(summary.AverageSlopePercent);
        Assert.Empty(summary.SlopeZonePercent);
    }

    [Fact]
    public void Summarize_UsesMedianRatherThanMeanForSkewedElevations()
    {
        var grid = ElevationGrid.Build(Square(), 11)!;
        // Most of the field near 100 m, with one high outlier ridge.
        grid.SetElevations(grid.AllPoints
            .Select((_, index) => (double?)(index == 60 ? 900 : 100))
            .ToList());

        var summary = grid.Summarize(SlopeOptions);

        Assert.Equal(100, summary.MedianElevationM);
        Assert.True(summary.AverageElevationM > summary.MedianElevationM);
    }
}
