using System.Buffers.Binary;
using System.IO.Compression;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>
/// Writes 8-bit RGBA PNGs. Index rasters are served as transparent map overlays,
/// and a hand-rolled encoder keeps the backend free of a native imaging
/// dependency that would otherwise have to be installed in the container image.
/// </summary>
public static class PngWriter
{
    private static readonly byte[] Signature = [0x89, (byte)'P', (byte)'N', (byte)'G', 0x0D, 0x0A, 0x1A, 0x0A];
    private static readonly uint[] CrcTable = BuildCrcTable();

    /// <param name="pixels">Row-major RGBA samples, four bytes per pixel.</param>
    public static byte[] EncodeRgba(byte[] pixels, int width, int height)
    {
        if (width <= 0 || height <= 0)
        {
            throw new ArgumentException("PNG dimensions must be positive.");
        }

        var expected = (long)width * height * 4;
        if (pixels.LongLength < expected)
        {
            throw new ArgumentException($"Expected {expected} RGBA bytes but received {pixels.LongLength}.", nameof(pixels));
        }

        using var output = new MemoryStream();
        output.Write(Signature);

        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(0, 4), width);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4, 4), height);
        header[8] = 8;  // bit depth
        header[9] = 6;  // colour type: truecolour with alpha
        header[10] = 0; // deflate
        header[11] = 0; // adaptive filtering
        header[12] = 0; // no interlace
        WriteChunk(output, "IHDR", header);

        WriteChunk(output, "IDAT", Compress(pixels, width, height));
        WriteChunk(output, "IEND", []);

        return output.ToArray();
    }

    private static byte[] Compress(byte[] pixels, int width, int height)
    {
        var stride = width * 4;
        using var raw = new MemoryStream((stride + 1) * height);

        for (var row = 0; row < height; row++)
        {
            raw.WriteByte(0); // filter type: none
            raw.Write(pixels, row * stride, stride);
        }

        using var compressed = new MemoryStream();
        using (var deflate = new ZLibStream(compressed, CompressionLevel.Optimal, leaveOpen: true))
        {
            raw.Position = 0;
            raw.CopyTo(deflate);
        }

        return compressed.ToArray();
    }

    private static void WriteChunk(Stream output, string type, byte[] data)
    {
        var length = new byte[4];
        BinaryPrimitives.WriteInt32BigEndian(length, data.Length);
        output.Write(length);

        var typeBytes = System.Text.Encoding.ASCII.GetBytes(type);
        output.Write(typeBytes);
        output.Write(data);

        var crc = Crc32(typeBytes, data);
        var crcBytes = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(crcBytes, crc);
        output.Write(crcBytes);
    }

    private static uint Crc32(byte[] type, byte[] data)
    {
        var crc = 0xFFFFFFFFu;

        foreach (var b in type)
        {
            crc = CrcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        }

        foreach (var b in data)
        {
            crc = CrcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        }

        return crc ^ 0xFFFFFFFFu;
    }

    private static uint[] BuildCrcTable()
    {
        var table = new uint[256];
        for (uint i = 0; i < 256; i++)
        {
            var value = i;
            for (var bit = 0; bit < 8; bit++)
            {
                value = (value & 1) != 0 ? 0xEDB88320u ^ (value >> 1) : value >> 1;
            }

            table[i] = value;
        }

        return table;
    }
}
