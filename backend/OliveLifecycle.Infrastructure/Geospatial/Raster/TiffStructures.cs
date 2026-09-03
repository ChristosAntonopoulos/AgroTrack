namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

internal static class TiffTags
{
    public const ushort NewSubfileType = 254;
    public const ushort ImageWidth = 256;
    public const ushort ImageLength = 257;
    public const ushort BitsPerSample = 258;
    public const ushort Compression = 259;
    public const ushort SamplesPerPixel = 277;
    public const ushort PlanarConfiguration = 284;
    public const ushort Predictor = 317;
    public const ushort TileWidth = 322;
    public const ushort TileLength = 323;
    public const ushort TileOffsets = 324;
    public const ushort TileByteCounts = 325;
    public const ushort SampleFormat = 339;
    public const ushort ModelPixelScale = 33550;
    public const ushort ModelTiepoint = 33922;
    public const ushort GeoKeyDirectory = 34735;
    public const ushort GdalNoData = 42113;
}

internal enum TiffCompression
{
    None = 1,
    Lzw = 5,
    Deflate = 8,
    AdobeDeflate = 32946
}

internal enum TiffSampleFormat
{
    UnsignedInteger = 1,
    SignedInteger = 2,
    Float = 3
}

/// <summary>A single directory entry, kept unresolved so out-of-header values are fetched on demand.</summary>
internal sealed class TiffEntry
{
    public ushort Tag { get; init; }
    public ushort Type { get; init; }
    public long Count { get; init; }

    /// <summary>Inline payload when the value fits in the entry, otherwise null.</summary>
    public byte[]? InlineValue { get; init; }

    /// <summary>File offset of the value when it does not fit inline.</summary>
    public long ValueOffset { get; init; }

    public int TypeSize => TypeSizeOf(Type);

    public long ByteLength => Count * TypeSize;

    public static int TypeSizeOf(ushort type) => type switch
    {
        1 or 2 or 6 or 7 => 1,
        3 or 8 => 2,
        4 or 9 or 11 => 4,
        5 or 10 or 12 or 16 or 17 or 18 => 8,
        _ => 0
    };
}

/// <summary>Reads primitives out of a TIFF byte block honouring the file's endianness.</summary>
internal readonly struct TiffByteOrder
{
    private readonly bool _littleEndian;

    public TiffByteOrder(bool littleEndian) => _littleEndian = littleEndian;

    public ushort ReadUInt16(ReadOnlySpan<byte> buffer, int offset)
    {
        var slice = buffer.Slice(offset, 2);
        return _littleEndian
            ? System.Buffers.Binary.BinaryPrimitives.ReadUInt16LittleEndian(slice)
            : System.Buffers.Binary.BinaryPrimitives.ReadUInt16BigEndian(slice);
    }

    public short ReadInt16(ReadOnlySpan<byte> buffer, int offset)
        => unchecked((short)ReadUInt16(buffer, offset));

    public uint ReadUInt32(ReadOnlySpan<byte> buffer, int offset)
    {
        var slice = buffer.Slice(offset, 4);
        return _littleEndian
            ? System.Buffers.Binary.BinaryPrimitives.ReadUInt32LittleEndian(slice)
            : System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(slice);
    }

    public int ReadInt32(ReadOnlySpan<byte> buffer, int offset)
        => unchecked((int)ReadUInt32(buffer, offset));

    public ulong ReadUInt64(ReadOnlySpan<byte> buffer, int offset)
    {
        var slice = buffer.Slice(offset, 8);
        return _littleEndian
            ? System.Buffers.Binary.BinaryPrimitives.ReadUInt64LittleEndian(slice)
            : System.Buffers.Binary.BinaryPrimitives.ReadUInt64BigEndian(slice);
    }

    public float ReadSingle(ReadOnlySpan<byte> buffer, int offset)
        => BitConverter.Int32BitsToSingle(ReadInt32(buffer, offset));

    public double ReadDouble(ReadOnlySpan<byte> buffer, int offset)
        => BitConverter.Int64BitsToDouble(unchecked((long)ReadUInt64(buffer, offset)));
}

/// <summary>A rectangular pixel region of a raster.</summary>
internal readonly record struct RasterWindow(int X, int Y, int Width, int Height)
{
    public long PixelCount => (long)Width * Height;
    public bool IsEmpty => Width <= 0 || Height <= 0;
}

/// <summary>
/// A north-up target grid in projected coordinates. Bands with different native
/// resolutions (10 m red/NIR, 20 m SWIR/red-edge/scene classification) are all
/// resampled onto one of these so index maths operates on aligned arrays.
/// </summary>
public sealed class RasterGrid
{
    public required int Epsg { get; init; }
    public required double OriginX { get; init; }
    public required double OriginY { get; init; }
    public required double PixelSize { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }

    public int PixelCount => Width * Height;

    public double CellCentreX(int column) => OriginX + (column + 0.5) * PixelSize;

    public double CellCentreY(int row) => OriginY - (row + 0.5) * PixelSize;

    public double MinX => OriginX;
    public double MaxX => OriginX + Width * PixelSize;
    public double MaxY => OriginY;
    public double MinY => OriginY - Height * PixelSize;
}
