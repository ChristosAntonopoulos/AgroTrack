using System.Buffers.Binary;
using System.IO.Compression;

namespace OliveLifecycle.Infrastructure.Tests.Geospatial;

public enum TestCompression
{
    None = 1,
    Lzw = 5,
    Deflate = 8
}

public sealed class TestTiffLevel
{
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required int TileWidth { get; init; }
    public required int TileHeight { get; init; }

    /// <summary>Sample value for a pixel, called with (column, row).</summary>
    public required Func<int, int, int> Sample { get; init; }

    /// <summary>Tiles whose index is listed here are written with a zero byte count, as sparse COGs do.</summary>
    public HashSet<int> SparseTiles { get; init; } = [];
}

/// <summary>
/// Builds small tiled GeoTIFFs in memory so the COG reader can be tested against
/// known pixel values without reaching the network. Mirrors the layout choices real
/// Sentinel-2 and Copernicus products use: little-endian classic TIFF, tiled,
/// deflate or LZW compressed, with a north-up UTM geotransform.
/// </summary>
public sealed class TestTiffBuilder
{
    private readonly List<TestTiffLevel> _levels = [];

    public int Epsg { get; init; } = 32634;
    public double OriginX { get; init; } = 500000;
    public double OriginY { get; init; } = 4000000;
    public double PixelSize { get; init; } = 10;
    public int BitsPerSample { get; init; } = 16;
    public TestCompression Compression { get; init; } = TestCompression.Deflate;
    public int Predictor { get; init; } = 1;
    public double? NoData { get; init; }
    public bool IncludeGeoKeys { get; init; } = true;

    public TestTiffBuilder AddLevel(TestTiffLevel level)
    {
        _levels.Add(level);
        return this;
    }

    public byte[] Build()
    {
        if (_levels.Count == 0)
        {
            throw new InvalidOperationException("At least one image level is required.");
        }

        var bytesPerSample = BitsPerSample / 8;
        var levelTiles = _levels.Select(level => EncodeTiles(level, bytesPerSample)).ToList();

        // First pass: assign offsets so directory entries can reference their payloads.
        var position = 8L;
        var tileOffsets = new List<long[]>();

        foreach (var tiles in levelTiles)
        {
            var offsets = new long[tiles.Count];
            for (var i = 0; i < tiles.Count; i++)
            {
                if (tiles[i].Length == 0)
                {
                    offsets[i] = 0;
                    continue;
                }

                offsets[i] = position;
                position += tiles[i].Length;
            }

            tileOffsets.Add(offsets);
        }

        var pixelScaleOffset = Reserve(ref position, 24);
        var tiepointOffset = Reserve(ref position, 48);
        var geoKeyOffset = IncludeGeoKeys ? Reserve(ref position, 8 * 2) : 0;
        var noDataOffset = NoData.HasValue ? Reserve(ref position, NoDataText().Length) : 0;

        var tileOffsetArrayOffsets = new long[_levels.Count];
        var tileByteCountArrayOffsets = new long[_levels.Count];
        for (var i = 0; i < _levels.Count; i++)
        {
            tileOffsetArrayOffsets[i] = Reserve(ref position, levelTiles[i].Count * 4);
            tileByteCountArrayOffsets[i] = Reserve(ref position, levelTiles[i].Count * 4);
        }

        var directoryOffsets = new long[_levels.Count];
        for (var i = 0; i < _levels.Count; i++)
        {
            directoryOffsets[i] = Reserve(ref position, DirectoryLength(i));
        }

        using var output = new MemoryStream();
        var writer = new BinaryWriter(output);

        writer.Write((byte)'I');
        writer.Write((byte)'I');
        writer.Write((ushort)42);
        writer.Write((uint)directoryOffsets[0]);

        foreach (var tiles in levelTiles)
        {
            foreach (var tile in tiles)
            {
                writer.Write(tile);
            }
        }

        WriteDoubles(writer, [PixelSize, PixelSize, 0]);
        WriteDoubles(writer, [0, 0, 0, OriginX, OriginY, 0]);

        if (IncludeGeoKeys)
        {
            // Directory header followed by one key: ProjectedCSTypeGeoKey.
            WriteShorts(writer, [1, 1, 0, 1, 3072, 0, 1, (ushort)Epsg]);
        }

        if (NoData.HasValue)
        {
            writer.Write(NoDataText());
        }

        for (var i = 0; i < _levels.Count; i++)
        {
            foreach (var offset in tileOffsets[i])
            {
                writer.Write((uint)offset);
            }

            foreach (var tile in levelTiles[i])
            {
                writer.Write((uint)tile.Length);
            }
        }

        for (var i = 0; i < _levels.Count; i++)
        {
            var next = i + 1 < _levels.Count ? (uint)directoryOffsets[i + 1] : 0u;

            // A single-element LONG array fits in the entry itself, which is how real
            // writers store the tile index of a one-tile image.
            var singleTile = levelTiles[i].Count == 1;
            var offsetsValue = singleTile ? (uint)tileOffsets[i][0] : (uint)tileOffsetArrayOffsets[i];
            var byteCountsValue = singleTile ? (uint)levelTiles[i][0].Length : (uint)tileByteCountArrayOffsets[i];

            WriteDirectory(writer, i, offsetsValue, byteCountsValue, pixelScaleOffset, tiepointOffset, geoKeyOffset, noDataOffset, next);
        }

        return output.ToArray();
    }

    private byte[] NoDataText() => System.Text.Encoding.ASCII.GetBytes($"{NoData!.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)}\0");

    private static long Reserve(ref long position, long length)
    {
        var offset = position;
        position += length;
        return offset;
    }

    private int DirectoryLength(int levelIndex)
    {
        // Matches the entries written by WriteDirectory, including SampleFormat.
        var entries = 14;
        if (levelIndex == 0)
        {
            entries += IncludeGeoKeys ? 3 : 2;
            if (NoData.HasValue)
            {
                entries++;
            }
        }

        return 2 + entries * 12 + 4;
    }

    private void WriteDirectory(
        BinaryWriter writer,
        int levelIndex,
        uint tileOffsetsValue,
        uint tileByteCountsValue,
        long pixelScaleOffset,
        long tiepointOffset,
        long geoKeyOffset,
        long noDataOffset,
        uint nextDirectoryOffset)
    {
        var level = _levels[levelIndex];
        var tileCount = TileCount(level);
        var entries = new List<(ushort Tag, ushort Type, uint Count, uint Value)>
        {
            (254, 4, 1, 0),
            (256, 4, 1, (uint)level.Width),
            (257, 4, 1, (uint)level.Height),
            (258, 3, 1, (uint)BitsPerSample),
            (259, 3, 1, (uint)Compression),
            (262, 3, 1, 1),
            (277, 3, 1, 1),
            (284, 3, 1, 1),
            (317, 3, 1, (uint)Predictor),
            (322, 3, 1, (uint)level.TileWidth),
            (323, 3, 1, (uint)level.TileHeight),
            (324, 4, (uint)tileCount, tileOffsetsValue),
            (325, 4, (uint)tileCount, tileByteCountsValue)
        };

        // Overview directories carry no geo tags, matching how GDAL writes COGs.
        if (levelIndex == 0)
        {
            entries.Add((33550, 12, 3, (uint)pixelScaleOffset));
            entries.Add((33922, 12, 6, (uint)tiepointOffset));

            if (IncludeGeoKeys)
            {
                entries.Add((34735, 3, 8, (uint)geoKeyOffset));
            }

            if (NoData.HasValue)
            {
                entries.Add((42113, 2, (uint)NoDataText().Length, (uint)noDataOffset));
            }
        }

        entries.Add((339, 3, 1, 1));
        entries.Sort((a, b) => a.Tag.CompareTo(b.Tag));

        writer.Write((ushort)entries.Count);
        foreach (var (tag, type, count, value) in entries)
        {
            writer.Write(tag);
            writer.Write(type);
            writer.Write(count);

            // Values of two bytes or fewer sit in the low half of the value field.
            var typeSize = type switch { 3 => 2, 4 => 4, 2 => 1, 12 => 8, _ => 4 };
            if ((long)count * typeSize <= 4 && type == 3)
            {
                writer.Write((ushort)value);
                writer.Write((ushort)0);
            }
            else
            {
                writer.Write(value);
            }
        }

        writer.Write(nextDirectoryOffset);
    }

    private static int TileCount(TestTiffLevel level)
    {
        var across = (level.Width + level.TileWidth - 1) / level.TileWidth;
        var down = (level.Height + level.TileHeight - 1) / level.TileHeight;
        return across * down;
    }

    private List<byte[]> EncodeTiles(TestTiffLevel level, int bytesPerSample)
    {
        var across = (level.Width + level.TileWidth - 1) / level.TileWidth;
        var down = (level.Height + level.TileHeight - 1) / level.TileHeight;
        var tiles = new List<byte[]>(across * down);

        for (var tileY = 0; tileY < down; tileY++)
        {
            for (var tileX = 0; tileX < across; tileX++)
            {
                var index = tileY * across + tileX;
                if (level.SparseTiles.Contains(index))
                {
                    tiles.Add([]);
                    continue;
                }

                var raw = new byte[level.TileWidth * level.TileHeight * bytesPerSample];
                for (var row = 0; row < level.TileHeight; row++)
                {
                    for (var column = 0; column < level.TileWidth; column++)
                    {
                        var value = level.Sample(tileX * level.TileWidth + column, tileY * level.TileHeight + row);
                        var offset = (row * level.TileWidth + column) * bytesPerSample;

                        if (bytesPerSample == 1)
                        {
                            raw[offset] = (byte)value;
                        }
                        else
                        {
                            BinaryPrimitives.WriteUInt16LittleEndian(raw.AsSpan(offset, 2), (ushort)value);
                        }
                    }
                }

                if (Predictor == 2)
                {
                    ApplyPredictor(raw, level.TileWidth, level.TileHeight, bytesPerSample);
                }

                tiles.Add(Compress(raw));
            }
        }

        return tiles;
    }

    private static void ApplyPredictor(byte[] buffer, int width, int height, int bytesPerSample)
    {
        var stride = width * bytesPerSample;

        for (var row = 0; row < height; row++)
        {
            var rowStart = row * stride;

            for (var column = width - 1; column > 0; column--)
            {
                if (bytesPerSample == 1)
                {
                    buffer[rowStart + column] = unchecked((byte)(buffer[rowStart + column] - buffer[rowStart + column - 1]));
                    continue;
                }

                var current = rowStart + column * 2;
                var previous = current - 2;
                var difference = unchecked((ushort)(
                    BinaryPrimitives.ReadUInt16LittleEndian(buffer.AsSpan(current, 2)) -
                    BinaryPrimitives.ReadUInt16LittleEndian(buffer.AsSpan(previous, 2))));
                BinaryPrimitives.WriteUInt16LittleEndian(buffer.AsSpan(current, 2), difference);
            }
        }
    }

    private byte[] Compress(byte[] raw)
    {
        switch (Compression)
        {
            case TestCompression.None:
                return raw;

            case TestCompression.Deflate:
                using (var output = new MemoryStream())
                {
                    using (var zlib = new ZLibStream(output, CompressionLevel.Optimal, leaveOpen: true))
                    {
                        zlib.Write(raw);
                    }

                    return output.ToArray();
                }

            case TestCompression.Lzw:
                return LzwEncode(raw);

            default:
                throw new NotSupportedException();
        }
    }

    /// <summary>
    /// Minimal TIFF LZW encoder. Only used to produce fixtures, so it favours
    /// clarity over compression ratio.
    /// </summary>
    private static byte[] LzwEncode(byte[] raw)
    {
        const int clearCode = 256;
        const int endOfInformation = 257;

        var dictionary = new Dictionary<string, int>();
        var nextCode = 258;
        var codeWidth = 9;
        var bits = new List<bool>();

        void Emit(int code, int width)
        {
            for (var bit = width - 1; bit >= 0; bit--)
            {
                bits.Add(((code >> bit) & 1) == 1);
            }
        }

        Emit(clearCode, codeWidth);

        var current = string.Empty;
        foreach (var b in raw)
        {
            var candidate = current + (char)b;
            if (candidate.Length == 1 || dictionary.ContainsKey(candidate))
            {
                current = candidate;
                continue;
            }

            Emit(current.Length == 1 ? current[0] : dictionary[current], codeWidth);
            dictionary[candidate] = nextCode++;
            current = ((char)b).ToString();

            // The decoder learns each entry one code later than the encoder, so its
            // width bump lags by one. Widening at this threshold keeps them in step.
            if (nextCode >= 1 << codeWidth && codeWidth < 12)
            {
                codeWidth++;
            }
        }

        if (current.Length > 0)
        {
            Emit(current.Length == 1 ? current[0] : dictionary[current], codeWidth);
        }

        Emit(endOfInformation, codeWidth);

        var bytes = new byte[(bits.Count + 7) / 8];
        for (var i = 0; i < bits.Count; i++)
        {
            if (bits[i])
            {
                bytes[i / 8] |= (byte)(1 << (7 - i % 8));
            }
        }

        return bytes;
    }

    private static void WriteDoubles(BinaryWriter writer, double[] values)
    {
        foreach (var value in values)
        {
            writer.Write(value);
        }
    }

    private static void WriteShorts(BinaryWriter writer, ushort[] values)
    {
        foreach (var value in values)
        {
            writer.Write(value);
        }
    }
}
