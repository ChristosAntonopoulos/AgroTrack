using System.Buffers.Binary;
using System.IO.Compression;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>
/// Persists an index grid as gzipped single-precision samples alongside its grid
/// definition. PNG overlays are lossy for analysis purposes, so a later date's
/// change map needs the original values of the earlier date rather than its colours.
/// </summary>
public static class IndexGridSerializer
{
    private const uint Magic = 0x47585449; // "ITXG"
    private const ushort Version = 1;

    public static byte[] Serialise(RasterGrid grid, double[] values)
    {
        if (values.Length != grid.PixelCount)
        {
            throw new ArgumentException($"Expected {grid.PixelCount} samples for the grid but received {values.Length}.", nameof(values));
        }

        using var output = new MemoryStream();

        using (var gzip = new GZipStream(output, CompressionLevel.Optimal, leaveOpen: true))
        {
            var header = new byte[46];
            BinaryPrimitives.WriteUInt32LittleEndian(header.AsSpan(0, 4), Magic);
            BinaryPrimitives.WriteUInt16LittleEndian(header.AsSpan(4, 2), Version);
            BinaryPrimitives.WriteInt32LittleEndian(header.AsSpan(6, 4), grid.Epsg);
            BinaryPrimitives.WriteDoubleLittleEndian(header.AsSpan(10, 8), grid.OriginX);
            BinaryPrimitives.WriteDoubleLittleEndian(header.AsSpan(18, 8), grid.OriginY);
            BinaryPrimitives.WriteDoubleLittleEndian(header.AsSpan(26, 8), grid.PixelSize);
            BinaryPrimitives.WriteInt32LittleEndian(header.AsSpan(34, 4), grid.Width);
            BinaryPrimitives.WriteInt32LittleEndian(header.AsSpan(38, 4), grid.Height);
            BinaryPrimitives.WriteInt32LittleEndian(header.AsSpan(42, 4), values.Length);
            gzip.Write(header);

            var samples = new byte[values.Length * 4];
            for (var i = 0; i < values.Length; i++)
            {
                BinaryPrimitives.WriteSingleLittleEndian(samples.AsSpan(i * 4, 4), (float)values[i]);
            }

            gzip.Write(samples);
        }

        return output.ToArray();
    }

    /// <summary>Returns null when the payload is not a recognisable index grid.</summary>
    public static (RasterGrid Grid, double[] Values)? Deserialise(Stream compressed)
    {
        using var gzip = new GZipStream(compressed, CompressionMode.Decompress);
        using var buffer = new MemoryStream();
        gzip.CopyTo(buffer);

        var bytes = buffer.ToArray();
        if (bytes.Length < 46 || BinaryPrimitives.ReadUInt32LittleEndian(bytes.AsSpan(0, 4)) != Magic)
        {
            return null;
        }

        if (BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(4, 2)) != Version)
        {
            return null;
        }

        var grid = new RasterGrid
        {
            Epsg = BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan(6, 4)),
            OriginX = BinaryPrimitives.ReadDoubleLittleEndian(bytes.AsSpan(10, 8)),
            OriginY = BinaryPrimitives.ReadDoubleLittleEndian(bytes.AsSpan(18, 8)),
            PixelSize = BinaryPrimitives.ReadDoubleLittleEndian(bytes.AsSpan(26, 8)),
            Width = BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan(34, 4)),
            Height = BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan(38, 4))
        };

        var count = BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan(42, 4));
        if (count < 0 || 46 + (long)count * 4 > bytes.Length)
        {
            return null;
        }

        var values = new double[count];
        for (var i = 0; i < count; i++)
        {
            values[i] = BinaryPrimitives.ReadSingleLittleEndian(bytes.AsSpan(46 + i * 4, 4));
        }

        return (grid, values);
    }

    /// <summary>
    /// Two grids can be differenced pixel-by-pixel only when they describe the same
    /// cells. Grids are snapped to whole pixels per field, so equality is exact.
    /// </summary>
    public static bool IsAligned(RasterGrid first, RasterGrid second)
        => first.Epsg == second.Epsg
        && first.Width == second.Width
        && first.Height == second.Height
        && Math.Abs(first.PixelSize - second.PixelSize) < 1e-6
        && Math.Abs(first.OriginX - second.OriginX) < 1e-3
        && Math.Abs(first.OriginY - second.OriginY) < 1e-3;
}
