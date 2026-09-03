using OliveLifecycle.Core.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Raster;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class CogBandReaderTests
{
    private const int Epsg = 32634;
    private const double OriginX = 500000;
    private const double OriginY = 4000000;
    private const double PixelSize = 10;

    /// <summary>Encodes the pixel position into the value so misplaced reads are obvious.</summary>
    private static int PositionalSample(int column, int row) => 1000 + row * 100 + column;

    private static byte[] BuildRaster(
        TestCompression compression = TestCompression.Deflate,
        int predictor = 1,
        double? noData = null,
        HashSet<int>? sparseTiles = null,
        bool includeGeoKeys = true)
    {
        return new TestTiffBuilder
        {
            Epsg = Epsg,
            OriginX = OriginX,
            OriginY = OriginY,
            PixelSize = PixelSize,
            Compression = compression,
            Predictor = predictor,
            NoData = noData,
            IncludeGeoKeys = includeGeoKeys
        }
        .AddLevel(new TestTiffLevel
        {
            Width = 32,
            Height = 32,
            TileWidth = 16,
            TileHeight = 16,
            Sample = PositionalSample,
            SparseTiles = sparseTiles ?? []
        })
        .Build();
    }

    private static RasterGrid GridAt(int column, int row, int width, int height) => new()
    {
        Epsg = Epsg,
        OriginX = OriginX + column * PixelSize,
        OriginY = OriginY - row * PixelSize,
        PixelSize = PixelSize,
        Width = width,
        Height = height
    };

    [Fact]
    public async Task OpenAsync_ReadsGeoreferencingAndDimensions()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster()));

        Assert.Equal(Epsg, reader.Epsg);
        Assert.Equal(32, reader.Width);
        Assert.Equal(32, reader.Height);
        Assert.Equal(PixelSize, reader.NativePixelSize);
    }

    [Fact]
    public async Task OpenAsync_RejectsNonTiffPayloads()
    {
        var garbage = new byte[64];
        await Assert.ThrowsAsync<InvalidDataException>(() => CogBandReader.OpenAsync(new MemoryRangeReader(garbage)));
    }

    [Fact]
    public async Task ReadOnGridAsync_ReturnsPixelsAtTheirGeographicPosition()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster()));

        var values = await reader.ReadOnGridAsync(GridAt(4, 6, 3, 2));

        Assert.Equal(PositionalSample(4, 6), values[0]);
        Assert.Equal(PositionalSample(6, 6), values[2]);
        Assert.Equal(PositionalSample(4, 7), values[3]);
        Assert.Equal(PositionalSample(6, 7), values[5]);
    }

    [Fact]
    public async Task ReadOnGridAsync_StitchesAcrossTileBoundaries()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster()));

        // Straddles the boundary between all four 16x16 tiles.
        var values = await reader.ReadOnGridAsync(GridAt(15, 15, 2, 2));

        Assert.Equal(PositionalSample(15, 15), values[0]);
        Assert.Equal(PositionalSample(16, 15), values[1]);
        Assert.Equal(PositionalSample(15, 16), values[2]);
        Assert.Equal(PositionalSample(16, 16), values[3]);
    }

    [Theory]
    [InlineData(TestCompression.None)]
    [InlineData(TestCompression.Deflate)]
    [InlineData(TestCompression.Lzw)]
    public async Task ReadOnGridAsync_SupportsEachCompressionScheme(TestCompression compression)
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster(compression)));

        var values = await reader.ReadOnGridAsync(GridAt(3, 9, 2, 1));

        Assert.Equal(PositionalSample(3, 9), values[0]);
        Assert.Equal(PositionalSample(4, 9), values[1]);
    }

    [Fact]
    public async Task ReadOnGridAsync_ReversesHorizontalDifferencing()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster(predictor: 2)));

        var values = await reader.ReadOnGridAsync(GridAt(0, 0, 4, 1));

        Assert.Equal(new[] { PositionalSample(0, 0), PositionalSample(1, 0), PositionalSample(2, 0), PositionalSample(3, 0) }
            .Select(v => (double)v), values);
    }

    [Fact]
    public async Task ReadOnGridAsync_TreatsDeclaredNoDataAsMissing()
    {
        var noDataValue = PositionalSample(5, 5);
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster(noData: noDataValue)));

        var values = await reader.ReadOnGridAsync(GridAt(5, 5, 2, 1));

        Assert.True(double.IsNaN(values[0]));
        Assert.Equal(PositionalSample(6, 5), values[1]);
    }

    [Fact]
    public async Task ReadOnGridAsync_TreatsOmittedTilesAsMissing()
    {
        // Tile index 3 is the bottom-right of the 2x2 tile layout.
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster(sparseTiles: [3])));

        var values = await reader.ReadOnGridAsync(GridAt(20, 20, 1, 1));
        Assert.True(double.IsNaN(values[0]));

        var populated = await reader.ReadOnGridAsync(GridAt(2, 2, 1, 1));
        Assert.Equal(PositionalSample(2, 2), populated[0]);
    }

    [Fact]
    public async Task ReadOnGridAsync_ReturnsMissingValuesOutsideTheRaster()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster()));

        var values = await reader.ReadOnGridAsync(GridAt(200, 200, 2, 2));

        Assert.All(values, value => Assert.True(double.IsNaN(value)));
    }

    [Fact]
    public async Task ReadOnGridAsync_RejectsAMismatchedProjection()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster()));
        var wrongCrs = new RasterGrid
        {
            Epsg = 32635,
            OriginX = OriginX,
            OriginY = OriginY,
            PixelSize = PixelSize,
            Width = 2,
            Height = 2
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => reader.ReadOnGridAsync(wrongCrs));
    }

    [Fact]
    public async Task OpenAsync_DerivesOverviewResolutionFromTheFullImage()
    {
        var raster = new TestTiffBuilder { Epsg = Epsg, OriginX = OriginX, OriginY = OriginY, PixelSize = PixelSize }
            .AddLevel(new TestTiffLevel { Width = 32, Height = 32, TileWidth = 16, TileHeight = 16, Sample = PositionalSample })
            .AddLevel(new TestTiffLevel { Width = 16, Height = 16, TileWidth = 16, TileHeight = 16, Sample = (c, r) => 7000 + r * 100 + c })
            .Build();

        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(raster));

        Assert.Equal(2, reader.LevelCount);

        // Requesting a 20 m grid should fall through to the 20 m overview.
        var coarse = await reader.ReadOnGridAsync(new RasterGrid
        {
            Epsg = Epsg,
            OriginX = OriginX,
            OriginY = OriginY,
            PixelSize = PixelSize * 2,
            Width = 2,
            Height = 1
        });

        Assert.Equal(7000, coarse[0]);
        Assert.Equal(7001, coarse[1]);
    }

    [Fact]
    public async Task ReadOnGridAsync_UsesFullResolutionWhenNoCoarserLevelFits()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster()));

        // A 5 m request cannot be served by the 10 m image at higher fidelity, so the
        // finest available level is used and each output cell repeats its source pixel.
        var values = await reader.ReadOnGridAsync(new RasterGrid
        {
            Epsg = Epsg,
            OriginX = OriginX,
            OriginY = OriginY,
            PixelSize = PixelSize / 2,
            Width = 2,
            Height = 1
        });

        Assert.Equal(PositionalSample(0, 0), values[0]);
        Assert.Equal(PositionalSample(0, 0), values[1]);
    }

    [Fact]
    public async Task OpenAsync_ReportsNoProjectionWhenGeoKeysAreAbsent()
    {
        var reader = await CogBandReader.OpenAsync(new MemoryRangeReader(BuildRaster(includeGeoKeys: false)));

        Assert.Equal(0, reader.Epsg);

        // Without a declared CRS the caller's grid is trusted rather than rejected.
        var values = await reader.ReadOnGridAsync(GridAt(1, 1, 1, 1));
        Assert.Equal(PositionalSample(1, 1), values[0]);
    }

    [Fact]
    public void BuildGrid_CoversTheRequestedBoundingBoxAndSnapsToPixels()
    {
        var grid = CogBandReader.BuildGrid(37.9, 22.9, 37.91, 22.915, 10, Epsg);

        Assert.Equal(Epsg, grid.Epsg);
        Assert.Equal(0, grid.OriginX % 10, 6);
        Assert.Equal(0, grid.OriginY % 10, 6);

        var (minCornerEasting, minCornerNorthing) = UtmProjection.ToUtm(37.9, 22.9, 34, true);
        Assert.True(grid.MinX <= minCornerEasting);
        Assert.True(grid.MinY <= minCornerNorthing);

        var (maxCornerEasting, maxCornerNorthing) = UtmProjection.ToUtm(37.91, 22.915, 34, true);
        Assert.True(grid.MaxX >= maxCornerEasting);
        Assert.True(grid.MaxY >= maxCornerNorthing);
    }

    [Fact]
    public void BuildGrid_CoarsensRatherThanRefusingVeryLargeFields()
    {
        var grid = CogBandReader.BuildGrid(37.0, 22.0, 38.0, 23.0, 10, Epsg, maxDimension: 512);

        Assert.True(grid.PixelSize > 10);
        Assert.True(grid.Width <= 512 + 1);
        Assert.True(grid.Height <= 512 + 1);
    }

    [Fact]
    public void BuildGrid_RejectsNonUtmProjections()
    {
        Assert.Throws<NotSupportedException>(() => CogBandReader.BuildGrid(37.9, 22.9, 37.91, 22.91, 10, 4326));
    }
}
