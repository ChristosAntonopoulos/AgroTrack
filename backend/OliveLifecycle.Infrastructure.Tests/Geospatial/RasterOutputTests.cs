using System.Buffers.Binary;
using System.IO.Compression;
using OliveLifecycle.Core.Geospatial;
using OliveLifecycle.Infrastructure.Geospatial.Raster;
using Xunit;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public class RasterStatisticsTests
{
    [Fact]
    public void Summarise_IgnoresMissingPixels()
    {
        var stats = RasterStatistics.Summarise([0.2, double.NaN, 0.4, 0.6]);

        Assert.NotNull(stats);
        Assert.Equal(3, stats.ValidPixelCount);
        Assert.Equal(0.4, stats.Mean, 4);
        Assert.Equal(0.4, stats.Median, 4);
        Assert.Equal(0.2, stats.Minimum, 4);
        Assert.Equal(0.6, stats.Maximum, 4);
    }

    [Fact]
    public void Summarise_ReturnsNullRatherThanZeroWhenNothingIsVisible()
    {
        Assert.Null(RasterStatistics.Summarise([double.NaN, double.NaN]));
        Assert.Null(RasterStatistics.Summarise([]));
    }

    [Fact]
    public void Summarise_ReportsSpreadAcrossTheField()
    {
        var stats = RasterStatistics.Summarise([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);

        Assert.NotNull(stats);
        Assert.Equal(0.5, stats.Median, 4);
        Assert.Equal(0.18, stats.P10, 2);
        Assert.Equal(0.82, stats.P90, 2);
        Assert.True(stats.StandardDeviation > 0);
    }

    [Fact]
    public void Summarise_HandlesASinglePixel()
    {
        var stats = RasterStatistics.Summarise([0.42]);

        Assert.NotNull(stats);
        Assert.Equal(0.42, stats.Mean, 4);
        Assert.Equal(0, stats.StandardDeviation);
        Assert.Equal(1, stats.ValidPixelCount);
    }

    [Theory]
    [InlineData(0, 0.1)]
    [InlineData(50, 0.5)]
    [InlineData(100, 0.9)]
    public void Percentile_InterpolatesBetweenSamples(double percentile, double expected)
    {
        var sorted = new[] { 0.1, 0.3, 0.5, 0.7, 0.9 };

        Assert.Equal(expected, RasterStatistics.Percentile(sorted, percentile), 4);
    }

    [Fact]
    public void ShareBelow_ReportsTheAffectedShareOfVisiblePixels()
    {
        var share = RasterStatistics.ShareBelow([0.1, 0.2, 0.5, double.NaN], 0.3);

        Assert.Equal(66.7, share);
    }

    [Fact]
    public void ShareAbove_IsComplementaryToShareBelow()
    {
        double[] values = [0.1, 0.4, 0.5];

        Assert.Equal(33.3, RasterStatistics.ShareBelow(values, 0.3));
        Assert.Equal(66.7, RasterStatistics.ShareAbove(values, 0.3));
    }

    [Fact]
    public void ShareBelow_ReturnsNullWhenNothingIsVisible()
    {
        Assert.Null(RasterStatistics.ShareBelow([double.NaN], 0.3));
    }
}

public class ColourRampTests
{
    [Fact]
    public void Sample_ClampsBeyondTheDeclaredRange()
    {
        var low = ColourRamp.Ndvi.Sample(-5);
        var high = ColourRamp.Ndvi.Sample(5);

        Assert.Equal((0xA6, 0x61, 0x1A), (low.R, low.G, low.B));
        Assert.Equal((0x1B, 0x78, 0x37), (high.R, high.G, high.B));
    }

    [Fact]
    public void Sample_MovesFromBareSoilToVigorousGreenAsNdviRises()
    {
        var sparse = ColourRamp.Ndvi.Sample(0.1);
        var dense = ColourRamp.Ndvi.Sample(0.8);

        // The ramp shifts hue rather than brightness, so the meaningful test is
        // which channel dominates at each end, not the absolute green level.
        Assert.True(sparse.R > sparse.G);
        Assert.True(dense.G > dense.R);
    }

    [Fact]
    public void Change_IsNeutralAtZeroAndDivergesEitherSide()
    {
        var noChange = ColourRamp.Change.Sample(0);
        var decline = ColourRamp.Change.Sample(-0.2);
        var growth = ColourRamp.Change.Sample(0.2);

        Assert.Equal(noChange.R, noChange.B);
        Assert.True(decline.R > decline.B);
        Assert.True(growth.B > growth.R);
    }

    [Theory]
    [InlineData("ndvi", "ndvi")]
    [InlineData("savi", "ndvi")]
    [InlineData("ndmi", "ndmi")]
    [InlineData("ndwi", "ndmi")]
    [InlineData("ndvi-change", "ndvi-change")]
    public void ForIndex_MapsEachIndexToARamp(string indexId, string expectedRampId)
    {
        Assert.Equal(expectedRampId, ColourRamp.ForIndex(indexId).Id);
    }
}

public class RasterRendererTests
{
    [Fact]
    public void RenderIndex_LeavesMissingPixelsTransparent()
    {
        var pixels = RasterRenderer.RenderIndex([0.5, double.NaN], 2, 1, ColourRamp.Ndvi);

        Assert.Equal(255, pixels[3]);
        Assert.Equal(0, pixels[7]);
    }

    [Fact]
    public void RenderTrueColour_StretchesEachBandIndependently()
    {
        // Blue is a narrow band of dark values; without a per-band stretch it would
        // render almost black next to the brighter red and green bands.
        double[] red = [0.10, 0.20, 0.30, 0.40];
        double[] green = [0.10, 0.20, 0.30, 0.40];
        double[] blue = [0.01, 0.02, 0.03, 0.04];

        var pixels = RasterRenderer.RenderTrueColour(red, green, blue, 4, 1);

        Assert.Equal(0, pixels[2]);
        Assert.Equal(255, pixels[14]);
        Assert.Equal(255, pixels[3]);
    }

    [Fact]
    public void RenderTrueColour_SkipsPixelsMissingAnyBand()
    {
        var pixels = RasterRenderer.RenderTrueColour([0.2, double.NaN], [0.2, 0.2], [0.2, 0.2], 2, 1);

        Assert.Equal(255, pixels[3]);
        Assert.Equal(0, pixels[7]);
    }
}

public class PngWriterTests
{
    [Fact]
    public void EncodeRgba_WritesAValidSignatureAndHeader()
    {
        var pixels = new byte[3 * 2 * 4];
        var png = PngWriter.EncodeRgba(pixels, 3, 2);

        Assert.Equal(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, png[..8]);
        Assert.Equal("IHDR", System.Text.Encoding.ASCII.GetString(png, 12, 4));
        Assert.Equal(3, BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(16, 4)));
        Assert.Equal(2, BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(20, 4)));
        Assert.Equal(8, png[24]);
        Assert.Equal(6, png[25]);
    }

    [Fact]
    public void EncodeRgba_EndsWithTheTerminatingChunk()
    {
        var png = PngWriter.EncodeRgba(new byte[4], 1, 1);

        Assert.Equal("IEND", System.Text.Encoding.ASCII.GetString(png, png.Length - 8, 4));
    }

    [Fact]
    public void EncodeRgba_CompressesScanlinesWithAFilterByte()
    {
        var pixels = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 };
        var png = PngWriter.EncodeRgba(pixels, 2, 1);

        var raw = InflateFirstIdat(png);

        Assert.Equal(0, raw[0]);
        Assert.Equal(pixels, raw[1..]);
    }

    [Fact]
    public void EncodeRgba_RejectsShortBuffersAndEmptyImages()
    {
        Assert.Throws<ArgumentException>(() => PngWriter.EncodeRgba(new byte[4], 2, 2));
        Assert.Throws<ArgumentException>(() => PngWriter.EncodeRgba([], 0, 0));
    }

    /// <summary>Walks the chunk list to find IDAT and inflates its zlib payload.</summary>
    private static byte[] InflateFirstIdat(byte[] png)
    {
        var position = 8;
        while (position + 8 <= png.Length)
        {
            var length = BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(position, 4));
            var type = System.Text.Encoding.ASCII.GetString(png, position + 4, 4);
            var data = png.AsSpan(position + 8, length).ToArray();
            position += 12 + length;

            if (type != "IDAT")
            {
                continue;
            }

            using var source = new MemoryStream(data);
            using var zlib = new ZLibStream(source, CompressionMode.Decompress);
            using var output = new MemoryStream();
            zlib.CopyTo(output);
            return output.ToArray();
        }

        throw new InvalidOperationException("No IDAT chunk was written.");
    }
}

public class IndexGridSerializerTests
{
    private static RasterGrid Grid(double originX = 500000, int width = 3, int height = 2) => new()
    {
        Epsg = 32634,
        OriginX = originX,
        OriginY = 4000000,
        PixelSize = 10,
        Width = width,
        Height = height
    };

    [Fact]
    public void Serialise_RoundTripsGridAndValues()
    {
        var grid = Grid();
        double[] values = [0.1, 0.2, 0.3, 0.4, double.NaN, 0.6];

        var payload = IndexGridSerializer.Serialise(grid, values);
        var restored = IndexGridSerializer.Deserialise(new MemoryStream(payload));

        Assert.NotNull(restored);
        Assert.Equal(grid.Epsg, restored.Value.Grid.Epsg);
        Assert.Equal(grid.OriginX, restored.Value.Grid.OriginX);
        Assert.Equal(grid.Width, restored.Value.Grid.Width);
        Assert.Equal(grid.Height, restored.Value.Grid.Height);

        for (var i = 0; i < values.Length; i++)
        {
            if (double.IsNaN(values[i]))
            {
                Assert.True(double.IsNaN(restored.Value.Values[i]));
                continue;
            }

            Assert.Equal(values[i], restored.Value.Values[i], 5);
        }
    }

    [Fact]
    public void Serialise_RejectsAValueCountThatDoesNotMatchTheGrid()
    {
        Assert.Throws<ArgumentException>(() => IndexGridSerializer.Serialise(Grid(), [0.1, 0.2]));
    }

    [Fact]
    public void Deserialise_RejectsForeignPayloads()
    {
        using var output = new MemoryStream();
        using (var gzip = new GZipStream(output, CompressionLevel.Fastest, leaveOpen: true))
        {
            gzip.Write(new byte[64]);
        }

        Assert.Null(IndexGridSerializer.Deserialise(new MemoryStream(output.ToArray())));
    }

    [Fact]
    public void IsAligned_AcceptsIdenticalGridsAndRejectsShiftedOnes()
    {
        Assert.True(IndexGridSerializer.IsAligned(Grid(), Grid()));
        Assert.False(IndexGridSerializer.IsAligned(Grid(), Grid(originX: 500010)));
        Assert.False(IndexGridSerializer.IsAligned(Grid(), Grid(width: 4)));
    }
}

public class GeographicResamplerTests
{
    private static RasterGrid Grid() => CogBandReader.BuildGrid(37.90, 22.90, 37.91, 22.91, 10, 32634);

    [Fact]
    public void Resample_PreservesValuesAndSizeWhileAligningToLatLng()
    {
        var grid = Grid();
        var values = Enumerable.Range(0, grid.PixelCount).Select(i => (double)(i % 7) / 10).ToArray();

        var overlay = GeographicResampler.Resample(grid, values);

        Assert.Equal(grid.Width, overlay.Width);
        Assert.Equal(grid.Height, overlay.Height);
        Assert.Equal(overlay.Width * overlay.Height, overlay.Values.Length);

        // Every resampled value must have come from the source grid.
        var distinctSource = values.Distinct().ToHashSet();
        Assert.All(overlay.Values.Where(v => !double.IsNaN(v)), v => Assert.Contains(v, distinctSource));
    }

    [Fact]
    public void Resample_KeepsTheFieldWithinTheReportedBounds()
    {
        var grid = Grid();
        var overlay = GeographicResampler.Resample(grid, new double[grid.PixelCount]);

        Assert.True(overlay.Bounds[0] <= 22.90);
        Assert.True(overlay.Bounds[1] <= 37.90);
        Assert.True(overlay.Bounds[2] >= 22.91);
        Assert.True(overlay.Bounds[3] >= 37.91);
    }

    [Fact]
    public void Resample_RejectsNonUtmGrids()
    {
        var grid = new RasterGrid { Epsg = 4326, OriginX = 0, OriginY = 0, PixelSize = 1, Width = 1, Height = 1 };

        Assert.Throws<NotSupportedException>(() => GeographicResampler.Resample(grid, [0]));
    }
}
