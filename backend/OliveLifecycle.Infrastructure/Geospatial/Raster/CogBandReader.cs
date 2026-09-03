using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>
/// Minimal Cloud-Optimized GeoTIFF reader for single-band satellite imagery.
///
/// It deliberately implements only what Sentinel-2 and Copernicus COGs use
/// (tiled layout, deflate or LZW compression, north-up UTM geotransform) rather
/// than taking a GDAL dependency, because fields are hectares in size and we
/// only ever need the handful of tiles that cover one boundary.
/// </summary>
public sealed class CogBandReader
{
    /// <summary>Guard against a malformed geotransform asking us to buffer a whole scene.</summary>
    private const long MaxWindowPixels = 16L * 1024 * 1024;

    private readonly IRangeReader _reader;
    private readonly TiffByteOrder _order;
    private readonly bool _littleEndian;
    private readonly List<CogLevel> _levels;

    private CogBandReader(IRangeReader reader, TiffByteOrder order, bool littleEndian, List<CogLevel> levels, int epsg)
    {
        _reader = reader;
        _order = order;
        _littleEndian = littleEndian;
        _levels = levels;
        Epsg = epsg;
    }

    /// <summary>Projected CRS of the raster, or 0 when the file carries no projection key.</summary>
    public int Epsg { get; }

    public double NativePixelSize => _levels[0].PixelSizeX;

    public int Width => _levels[0].Width;

    public int Height => _levels[0].Height;

    /// <summary>Number of resolution levels, including the full-resolution image.</summary>
    public int LevelCount => _levels.Count;

    public static async Task<CogBandReader> OpenAsync(IRangeReader reader, CancellationToken cancellationToken = default)
    {
        var header = await reader.ReadAsync(0, 8, cancellationToken);
        if (header.Length < 8)
        {
            throw new InvalidDataException("Raster is too small to contain a TIFF header.");
        }

        var littleEndian = header[0] switch
        {
            0x49 when header[1] == 0x49 => true,
            0x4D when header[1] == 0x4D => false,
            _ => throw new InvalidDataException("Not a TIFF: byte order mark missing.")
        };

        var order = new TiffByteOrder(littleEndian);
        var magic = order.ReadUInt16(header, 2);
        if (magic == 43)
        {
            throw new NotSupportedException("BigTIFF rasters are not supported.");
        }

        if (magic != 42)
        {
            throw new InvalidDataException($"Not a TIFF: unexpected magic number {magic}.");
        }

        var levels = new List<CogLevel>();
        var epsg = 0;
        double? rootPixelScaleX = null;
        double? rootPixelScaleY = null;
        double rootOriginX = 0;
        double rootOriginY = 0;
        var rootWidth = 0;

        var nextOffset = (long)order.ReadUInt32(header, 4);
        var directoriesRead = 0;

        while (nextOffset > 0 && directoriesRead < 64)
        {
            var (entries, followingOffset) = await ReadDirectoryAsync(reader, order, nextOffset, cancellationToken);
            nextOffset = followingOffset;
            directoriesRead++;

            // Skip internal mask and per-page auxiliary directories.
            var subfileType = await ReadScalarAsync(reader, order, entries, TiffTags.NewSubfileType, cancellationToken) ?? 0;
            if (((long)subfileType & 4) != 0)
            {
                continue;
            }

            if (!entries.ContainsKey(TiffTags.TileOffsets))
            {
                // Striped imagery is not produced by the providers we read from.
                continue;
            }

            var level = await ReadLevelAsync(reader, order, entries, cancellationToken);

            if (levels.Count == 0)
            {
                epsg = await ReadEpsgAsync(reader, order, entries, cancellationToken);
                rootPixelScaleX = level.PixelSizeX;
                rootPixelScaleY = level.PixelSizeY;
                rootOriginX = level.OriginX;
                rootOriginY = level.OriginY;
                rootWidth = level.Width;
            }
            else if (level.PixelSizeX <= 0 && rootPixelScaleX.HasValue && rootWidth > 0)
            {
                // Overview directories omit GeoTIFF tags by convention; derive their
                // resolution from the ratio against the full-resolution image.
                var factor = (double)rootWidth / level.Width;
                level.PixelSizeX = rootPixelScaleX.Value * factor;
                level.PixelSizeY = rootPixelScaleY!.Value * factor;
                level.OriginX = rootOriginX;
                level.OriginY = rootOriginY;
            }

            if (level.PixelSizeX > 0)
            {
                levels.Add(level);
            }
        }

        if (levels.Count == 0)
        {
            throw new InvalidDataException("No usable tiled image directory found in raster.");
        }

        levels.Sort((a, b) => a.PixelSizeX.CompareTo(b.PixelSizeX));
        return new CogBandReader(reader, order, littleEndian, levels, epsg);
    }

    /// <summary>
    /// Samples the raster onto the supplied grid, returning one value per grid cell
    /// with <see cref="double.NaN"/> where the raster has no data. Sampling is
    /// nearest-neighbour, which is correct for our usage because the grid is always
    /// at or below the finest band resolution.
    /// </summary>
    public async Task<double[]> ReadOnGridAsync(RasterGrid grid, CancellationToken cancellationToken = default)
    {
        if (Epsg != 0 && grid.Epsg != Epsg)
        {
            throw new InvalidOperationException($"Grid CRS EPSG:{grid.Epsg} does not match raster CRS EPSG:{Epsg}.");
        }

        var level = SelectLevel(grid.PixelSize);
        var window = ComputeWindow(level, grid);

        var values = new double[grid.PixelCount];
        Array.Fill(values, double.NaN);

        if (window.IsEmpty)
        {
            return values;
        }

        var windowValues = await ReadWindowAsync(level, window, cancellationToken);

        for (var row = 0; row < grid.Height; row++)
        {
            var centreY = grid.CellCentreY(row);
            var sourceRow = (int)Math.Floor((level.OriginY - centreY) / level.PixelSizeY);
            var localRow = sourceRow - window.Y;
            if (localRow < 0 || localRow >= window.Height)
            {
                continue;
            }

            for (var column = 0; column < grid.Width; column++)
            {
                var centreX = grid.CellCentreX(column);
                var sourceColumn = (int)Math.Floor((centreX - level.OriginX) / level.PixelSizeX);
                var localColumn = sourceColumn - window.X;
                if (localColumn < 0 || localColumn >= window.Width)
                {
                    continue;
                }

                values[row * grid.Width + column] = windowValues[localRow * window.Width + localColumn];
            }
        }

        return values;
    }

    /// <summary>Coarsest level that still resolves the requested grid spacing.</summary>
    private CogLevel SelectLevel(double targetPixelSize)
    {
        var selected = _levels[0];
        foreach (var level in _levels)
        {
            if (level.PixelSizeX <= targetPixelSize + 1e-6)
            {
                selected = level;
            }
        }

        return selected;
    }

    private static RasterWindow ComputeWindow(CogLevel level, RasterGrid grid)
    {
        var firstColumn = (int)Math.Floor((grid.MinX - level.OriginX) / level.PixelSizeX);
        var lastColumn = (int)Math.Ceiling((grid.MaxX - level.OriginX) / level.PixelSizeX);
        var firstRow = (int)Math.Floor((level.OriginY - grid.MaxY) / level.PixelSizeY);
        var lastRow = (int)Math.Ceiling((level.OriginY - grid.MinY) / level.PixelSizeY);

        firstColumn = Math.Clamp(firstColumn, 0, level.Width);
        lastColumn = Math.Clamp(lastColumn, 0, level.Width);
        firstRow = Math.Clamp(firstRow, 0, level.Height);
        lastRow = Math.Clamp(lastRow, 0, level.Height);

        return new RasterWindow(firstColumn, firstRow, lastColumn - firstColumn, lastRow - firstRow);
    }

    private async Task<double[]> ReadWindowAsync(CogLevel level, RasterWindow window, CancellationToken cancellationToken)
    {
        if (window.PixelCount > MaxWindowPixels)
        {
            throw new InvalidOperationException($"Requested raster window of {window.PixelCount} pixels exceeds the supported maximum.");
        }

        var values = new double[window.PixelCount];
        Array.Fill(values, double.NaN);

        var tilesAcross = (level.Width + level.TileWidth - 1) / level.TileWidth;
        var bytesPerSample = level.BitsPerSample / 8;
        var expectedTileBytes = level.TileWidth * level.TileHeight * level.SamplesPerPixel * bytesPerSample;

        var firstTileX = window.X / level.TileWidth;
        var lastTileX = (window.X + window.Width - 1) / level.TileWidth;
        var firstTileY = window.Y / level.TileHeight;
        var lastTileY = (window.Y + window.Height - 1) / level.TileHeight;

        for (var tileY = firstTileY; tileY <= lastTileY; tileY++)
        {
            for (var tileX = firstTileX; tileX <= lastTileX; tileX++)
            {
                var tileIndex = tileY * tilesAcross + tileX;
                if (tileIndex < 0 || tileIndex >= level.TileOffsets.Length)
                {
                    continue;
                }

                var byteCount = (int)level.TileByteCounts[tileIndex];
                if (byteCount <= 0)
                {
                    // Sparse COGs omit empty tiles entirely; leaving NaN is correct.
                    continue;
                }

                var raw = await _reader.ReadAsync(level.TileOffsets[tileIndex], byteCount, cancellationToken);
                var tile = TiffCodecs.Decompress(raw, level.Compression, expectedTileBytes);

                if (level.Predictor == 2)
                {
                    TiffCodecs.ReversePredictor(tile, level.TileWidth, level.TileHeight, level.SamplesPerPixel, level.BitsPerSample, _littleEndian);
                }

                CopyTile(level, tile, tileX, tileY, window, values);
            }
        }

        return values;
    }

    private void CopyTile(CogLevel level, byte[] tile, int tileX, int tileY, RasterWindow window, double[] destination)
    {
        var tileOriginX = tileX * level.TileWidth;
        var tileOriginY = tileY * level.TileHeight;

        var startX = Math.Max(window.X, tileOriginX);
        var endX = Math.Min(window.X + window.Width, tileOriginX + level.TileWidth);
        var startY = Math.Max(window.Y, tileOriginY);
        var endY = Math.Min(window.Y + window.Height, tileOriginY + level.TileHeight);

        var bytesPerSample = level.BitsPerSample / 8;
        var pixelStride = level.SamplesPerPixel * bytesPerSample;

        for (var y = startY; y < endY; y++)
        {
            var tileRow = y - tileOriginY;
            for (var x = startX; x < endX; x++)
            {
                var tileColumn = x - tileOriginX;
                var byteOffset = (tileRow * level.TileWidth + tileColumn) * pixelStride;
                if (byteOffset + bytesPerSample > tile.Length)
                {
                    continue;
                }

                var value = ReadSample(tile, byteOffset, level);
                if (level.NoData.HasValue && Math.Abs(value - level.NoData.Value) < double.Epsilon)
                {
                    continue;
                }

                destination[(y - window.Y) * window.Width + (x - window.X)] = value;
            }
        }
    }

    private double ReadSample(byte[] buffer, int offset, CogLevel level)
    {
        return (level.BitsPerSample, level.SampleFormat) switch
        {
            (8, TiffSampleFormat.SignedInteger) => unchecked((sbyte)buffer[offset]),
            (8, _) => buffer[offset],
            (16, TiffSampleFormat.SignedInteger) => _order.ReadInt16(buffer, offset),
            (16, _) => _order.ReadUInt16(buffer, offset),
            (32, TiffSampleFormat.Float) => _order.ReadSingle(buffer, offset),
            (32, TiffSampleFormat.SignedInteger) => _order.ReadInt32(buffer, offset),
            (32, _) => _order.ReadUInt32(buffer, offset),
            _ => throw new NotSupportedException($"{level.BitsPerSample}-bit {level.SampleFormat} samples are not supported.")
        };
    }

    private static async Task<(Dictionary<ushort, TiffEntry> Entries, long NextOffset)> ReadDirectoryAsync(
        IRangeReader reader,
        TiffByteOrder order,
        long offset,
        CancellationToken cancellationToken)
    {
        var countBytes = await reader.ReadAsync(offset, 2, cancellationToken);
        if (countBytes.Length < 2)
        {
            return ([], 0);
        }

        var entryCount = order.ReadUInt16(countBytes, 0);
        var blockLength = entryCount * 12 + 4;
        var block = await reader.ReadAsync(offset + 2, blockLength, cancellationToken);
        if (block.Length < blockLength)
        {
            throw new InvalidDataException("Truncated TIFF directory.");
        }

        var entries = new Dictionary<ushort, TiffEntry>(entryCount);
        for (var i = 0; i < entryCount; i++)
        {
            var position = i * 12;
            var tag = order.ReadUInt16(block, position);
            var type = order.ReadUInt16(block, position + 2);
            var count = order.ReadUInt32(block, position + 4);
            var typeSize = TiffEntry.TypeSizeOf(type);
            if (typeSize == 0)
            {
                continue;
            }

            var byteLength = (long)count * typeSize;
            entries[tag] = byteLength <= 4
                ? new TiffEntry { Tag = tag, Type = type, Count = count, InlineValue = block.AsSpan(position + 8, (int)byteLength).ToArray() }
                : new TiffEntry { Tag = tag, Type = type, Count = count, ValueOffset = order.ReadUInt32(block, position + 8) };
        }

        return (entries, order.ReadUInt32(block, entryCount * 12));
    }

    private static async Task<CogLevel> ReadLevelAsync(
        IRangeReader reader,
        TiffByteOrder order,
        Dictionary<ushort, TiffEntry> entries,
        CancellationToken cancellationToken)
    {
        var level = new CogLevel
        {
            Width = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.ImageWidth, cancellationToken) ?? 0),
            Height = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.ImageLength, cancellationToken) ?? 0),
            TileWidth = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.TileWidth, cancellationToken) ?? 0),
            TileHeight = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.TileLength, cancellationToken) ?? 0),
            BitsPerSample = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.BitsPerSample, cancellationToken) ?? 8),
            SamplesPerPixel = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.SamplesPerPixel, cancellationToken) ?? 1),
            Compression = (TiffCompression)(await ReadScalarAsync(reader, order, entries, TiffTags.Compression, cancellationToken) ?? 1),
            Predictor = (int)(await ReadScalarAsync(reader, order, entries, TiffTags.Predictor, cancellationToken) ?? 1),
            SampleFormat = (TiffSampleFormat)(await ReadScalarAsync(reader, order, entries, TiffTags.SampleFormat, cancellationToken) ?? 1)
        };

        if (level.Width <= 0 || level.Height <= 0 || level.TileWidth <= 0 || level.TileHeight <= 0)
        {
            throw new InvalidDataException("TIFF directory is missing image or tile dimensions.");
        }

        var planarConfiguration = await ReadScalarAsync(reader, order, entries, TiffTags.PlanarConfiguration, cancellationToken) ?? 1;
        if (planarConfiguration != 1)
        {
            throw new NotSupportedException("Planar (band-separated) TIFF layout is not supported.");
        }

        level.TileOffsets = await ReadIntegerArrayAsync(reader, order, entries, TiffTags.TileOffsets, cancellationToken);
        level.TileByteCounts = await ReadIntegerArrayAsync(reader, order, entries, TiffTags.TileByteCounts, cancellationToken);

        if (level.TileOffsets.Length != level.TileByteCounts.Length)
        {
            throw new InvalidDataException("TIFF tile index is inconsistent.");
        }

        var pixelScale = await ReadDoubleArrayAsync(reader, order, entries, TiffTags.ModelPixelScale, cancellationToken);
        var tiepoint = await ReadDoubleArrayAsync(reader, order, entries, TiffTags.ModelTiepoint, cancellationToken);

        if (pixelScale.Length >= 2 && tiepoint.Length >= 6)
        {
            level.PixelSizeX = Math.Abs(pixelScale[0]);
            level.PixelSizeY = Math.Abs(pixelScale[1]);
            level.OriginX = tiepoint[3] - tiepoint[0] * pixelScale[0];
            level.OriginY = tiepoint[4] + tiepoint[1] * pixelScale[1];
        }

        level.NoData = await ReadNoDataAsync(reader, entries, cancellationToken);
        return level;
    }

    private static async Task<double?> ReadNoDataAsync(IRangeReader reader, Dictionary<ushort, TiffEntry> entries, CancellationToken cancellationToken)
    {
        if (!entries.TryGetValue(TiffTags.GdalNoData, out var entry))
        {
            return null;
        }

        var bytes = entry.InlineValue ?? await reader.ReadAsync(entry.ValueOffset, (int)entry.ByteLength, cancellationToken);
        var text = System.Text.Encoding.ASCII.GetString(bytes).TrimEnd('\0', ' ');
        return double.TryParse(text, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var value)
            ? value
            : null;
    }

    /// <summary>Reads the projected CRS from the GeoTIFF key directory.</summary>
    private static async Task<int> ReadEpsgAsync(
        IRangeReader reader,
        TiffByteOrder order,
        Dictionary<ushort, TiffEntry> entries,
        CancellationToken cancellationToken)
    {
        const ushort projectedCsTypeGeoKey = 3072;
        const ushort geographicTypeGeoKey = 2048;

        if (!entries.TryGetValue(TiffTags.GeoKeyDirectory, out var entry))
        {
            return 0;
        }

        var bytes = entry.InlineValue ?? await reader.ReadAsync(entry.ValueOffset, (int)entry.ByteLength, cancellationToken);
        if (bytes.Length < 8)
        {
            return 0;
        }

        var keyCount = order.ReadUInt16(bytes, 6);
        var fallback = 0;

        for (var i = 0; i < keyCount; i++)
        {
            var position = 8 + i * 8;
            if (position + 8 > bytes.Length)
            {
                break;
            }

            var keyId = order.ReadUInt16(bytes, position);
            var tiffTagLocation = order.ReadUInt16(bytes, position + 2);
            var value = order.ReadUInt16(bytes, position + 6);

            // A non-zero location means the value lives in another tag, which never
            // happens for the EPSG keys written by the providers we read.
            if (tiffTagLocation != 0)
            {
                continue;
            }

            if (keyId == projectedCsTypeGeoKey)
            {
                return value;
            }

            if (keyId == geographicTypeGeoKey)
            {
                fallback = value;
            }
        }

        return fallback;
    }

    private static async Task<long?> ReadScalarAsync(
        IRangeReader reader,
        TiffByteOrder order,
        Dictionary<ushort, TiffEntry> entries,
        ushort tag,
        CancellationToken cancellationToken)
    {
        var values = await ReadIntegerArrayAsync(reader, order, entries, tag, cancellationToken);
        return values.Length == 0 ? null : values[0];
    }

    private static async Task<long[]> ReadIntegerArrayAsync(
        IRangeReader reader,
        TiffByteOrder order,
        Dictionary<ushort, TiffEntry> entries,
        ushort tag,
        CancellationToken cancellationToken)
    {
        var doubles = await ReadDoubleArrayAsync(reader, order, entries, tag, cancellationToken);
        return Array.ConvertAll(doubles, d => (long)d);
    }

    private static async Task<double[]> ReadDoubleArrayAsync(
        IRangeReader reader,
        TiffByteOrder order,
        Dictionary<ushort, TiffEntry> entries,
        ushort tag,
        CancellationToken cancellationToken)
    {
        if (!entries.TryGetValue(tag, out var entry) || entry.Count == 0)
        {
            return [];
        }

        var bytes = entry.InlineValue ?? await reader.ReadAsync(entry.ValueOffset, (int)entry.ByteLength, cancellationToken);
        var available = entry.TypeSize == 0 ? 0 : Math.Min(entry.Count, bytes.Length / entry.TypeSize);
        var values = new double[available];

        for (var i = 0; i < available; i++)
        {
            values[i] = ReadNumeric(order, bytes, i, entry.Type);
        }

        return values;
    }

    private static double ReadNumeric(TiffByteOrder order, ReadOnlySpan<byte> bytes, int index, ushort type) => type switch
    {
        1 or 2 or 7 => bytes[index],
        6 => unchecked((sbyte)bytes[index]),
        3 => order.ReadUInt16(bytes, index * 2),
        8 => order.ReadInt16(bytes, index * 2),
        4 => order.ReadUInt32(bytes, index * 4),
        9 => order.ReadInt32(bytes, index * 4),
        11 => order.ReadSingle(bytes, index * 4),
        12 => order.ReadDouble(bytes, index * 8),
        16 or 18 => order.ReadUInt64(bytes, index * 8),
        17 => unchecked((long)order.ReadUInt64(bytes, index * 8)),
        5 => order.ReadUInt32(bytes, index * 8) / (double)Math.Max(1u, order.ReadUInt32(bytes, index * 8 + 4)),
        10 => order.ReadInt32(bytes, index * 8) / (double)Math.Max(1, order.ReadInt32(bytes, index * 8 + 4)),
        _ => 0
    };

    /// <summary>
    /// Builds a north-up grid covering the given WGS84 bounding box in the raster's
    /// own projection, so bands can be read without any reprojection of pixels.
    /// </summary>
    public static RasterGrid BuildGrid(double minLat, double minLng, double maxLat, double maxLng, double pixelSize, int epsg, int maxDimension = 2048)
    {
        if (!UtmProjection.TryParseEpsg(epsg, out var zone, out var northern))
        {
            throw new NotSupportedException($"EPSG:{epsg} is not a supported UTM projection.");
        }

        // Project all four corners: a UTM box is not axis-aligned in geographic space.
        var corners = new[]
        {
            UtmProjection.ToUtm(minLat, minLng, zone, northern),
            UtmProjection.ToUtm(minLat, maxLng, zone, northern),
            UtmProjection.ToUtm(maxLat, minLng, zone, northern),
            UtmProjection.ToUtm(maxLat, maxLng, zone, northern)
        };

        var minX = corners.Min(c => c.Easting);
        var maxX = corners.Max(c => c.Easting);
        var minY = corners.Min(c => c.Northing);
        var maxY = corners.Max(c => c.Northing);

        // Snap outwards to whole pixels so repeated runs over the same field align.
        var originX = Math.Floor(minX / pixelSize) * pixelSize;
        var originY = Math.Ceiling(maxY / pixelSize) * pixelSize;
        var width = Math.Max(1, (int)Math.Ceiling((maxX - originX) / pixelSize));
        var height = Math.Max(1, (int)Math.Ceiling((originY - minY) / pixelSize));

        // Very large fields are coarsened rather than refused, keeping memory bounded.
        var scale = Math.Max(1, (int)Math.Ceiling(Math.Max(width, height) / (double)maxDimension));
        if (scale > 1)
        {
            pixelSize *= scale;
            originX = Math.Floor(minX / pixelSize) * pixelSize;
            originY = Math.Ceiling(maxY / pixelSize) * pixelSize;
            width = Math.Max(1, (int)Math.Ceiling((maxX - originX) / pixelSize));
            height = Math.Max(1, (int)Math.Ceiling((originY - minY) / pixelSize));
        }

        return new RasterGrid
        {
            Epsg = epsg,
            OriginX = originX,
            OriginY = originY,
            PixelSize = pixelSize,
            Width = width,
            Height = height
        };
    }
}

internal sealed class CogLevel
{
    public int Width { get; init; }
    public int Height { get; init; }
    public int TileWidth { get; init; }
    public int TileHeight { get; init; }
    public int BitsPerSample { get; init; }
    public int SamplesPerPixel { get; init; }
    public TiffSampleFormat SampleFormat { get; init; }
    public TiffCompression Compression { get; init; }
    public int Predictor { get; init; }
    public long[] TileOffsets { get; set; } = [];
    public long[] TileByteCounts { get; set; } = [];
    public double PixelSizeX { get; set; }
    public double PixelSizeY { get; set; }
    public double OriginX { get; set; }
    public double OriginY { get; set; }
    public double? NoData { get; set; }
}
