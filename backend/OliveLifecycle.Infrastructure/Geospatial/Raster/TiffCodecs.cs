using System.IO.Compression;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>
/// Decoders for the compression schemes used by Sentinel-2 and Copernicus COGs.
/// Only lossless schemes are supported on purpose: reflectance values feed
/// vegetation index maths, so lossy decoding would silently distort results.
/// </summary>
internal static class TiffCodecs
{
    public static byte[] Decompress(byte[] input, TiffCompression compression, int expectedLength)
    {
        return compression switch
        {
            TiffCompression.None => input,
            TiffCompression.Deflate or TiffCompression.AdobeDeflate => Inflate(input, expectedLength),
            TiffCompression.Lzw => DecodeLzw(input, expectedLength),
            _ => throw new NotSupportedException($"TIFF compression {(int)compression} is not supported.")
        };
    }

    private static byte[] Inflate(byte[] input, int expectedLength)
    {
        using var source = new MemoryStream(input);
        using var output = new MemoryStream(expectedLength > 0 ? expectedLength : 4096);

        // TIFF tag 8 and 32946 both mean "zlib stream" in practice, but some writers
        // emit a bare deflate stream, so sniff the two-byte zlib header first.
        Stream decompressor = HasZlibHeader(input)
            ? new ZLibStream(source, CompressionMode.Decompress)
            : new DeflateStream(source, CompressionMode.Decompress);

        using (decompressor)
        {
            decompressor.CopyTo(output);
        }

        return output.ToArray();
    }

    private static bool HasZlibHeader(byte[] input)
    {
        if (input.Length < 2)
        {
            return false;
        }

        var compressionMethod = input[0] & 0x0F;
        var checkValue = (input[0] << 8) | input[1];
        return compressionMethod == 8 && checkValue % 31 == 0;
    }

    /// <summary>
    /// TIFF-flavoured LZW: MSB-first codes, "early change" code width bump, and
    /// clear/end-of-information markers at 256/257.
    /// </summary>
    private static byte[] DecodeLzw(byte[] input, int expectedLength)
    {
        const int clearCode = 256;
        const int endOfInformation = 257;
        const int firstDynamicCode = 258;
        const int maxCode = 4096;

        var output = new MemoryStream(expectedLength > 0 ? expectedLength : 4096);
        var dictionary = new byte[maxCode][];
        for (var i = 0; i < 256; i++)
        {
            dictionary[i] = [(byte)i];
        }

        var nextCode = firstDynamicCode;
        var codeWidth = 9;
        byte[]? previous = null;
        var bitPosition = 0L;
        var totalBits = (long)input.Length * 8;

        while (bitPosition + codeWidth <= totalBits)
        {
            var code = ReadBits(input, bitPosition, codeWidth);
            bitPosition += codeWidth;

            if (code == endOfInformation)
            {
                break;
            }

            if (code == clearCode)
            {
                nextCode = firstDynamicCode;
                codeWidth = 9;
                previous = null;
                continue;
            }

            byte[] entry;
            if (code < nextCode && dictionary[code] != null)
            {
                entry = dictionary[code]!;
            }
            else if (previous != null)
            {
                entry = [.. previous, previous[0]];
            }
            else
            {
                break;
            }

            output.Write(entry, 0, entry.Length);

            if (previous != null && nextCode < maxCode)
            {
                dictionary[nextCode++] = [.. previous, entry[0]];
            }

            previous = entry;

            // Early change: widen one code before the dictionary actually fills.
            if (nextCode + 1 >= 1 << codeWidth && codeWidth < 12)
            {
                codeWidth++;
            }
        }

        return output.ToArray();
    }

    private static int ReadBits(byte[] input, long bitPosition, int bitCount)
    {
        var value = 0;
        for (var i = 0; i < bitCount; i++)
        {
            var absoluteBit = bitPosition + i;
            var b = input[absoluteBit >> 3];
            var bit = (b >> (int)(7 - (absoluteBit & 7))) & 1;
            value = (value << 1) | bit;
        }

        return value;
    }

    /// <summary>
    /// Reverses horizontal differencing (predictor 2), which COG writers apply
    /// before compression to improve ratios on smooth imagery.
    /// </summary>
    public static void ReversePredictor(byte[] buffer, int width, int height, int samplesPerPixel, int bitsPerSample, bool littleEndian)
    {
        var rowStride = width * samplesPerPixel * (bitsPerSample / 8);

        for (var row = 0; row < height; row++)
        {
            var rowStart = row * rowStride;
            if (rowStart + rowStride > buffer.Length)
            {
                break;
            }

            switch (bitsPerSample)
            {
                case 8:
                    for (var i = samplesPerPixel; i < rowStride; i++)
                    {
                        buffer[rowStart + i] = unchecked((byte)(buffer[rowStart + i] + buffer[rowStart + i - samplesPerPixel]));
                    }
                    break;

                case 16:
                    for (var i = samplesPerPixel; i < width * samplesPerPixel; i++)
                    {
                        var current = rowStart + i * 2;
                        var previous = rowStart + (i - samplesPerPixel) * 2;
                        var sum = unchecked((ushort)(ReadUInt16(buffer, current, littleEndian) + ReadUInt16(buffer, previous, littleEndian)));
                        WriteUInt16(buffer, current, sum, littleEndian);
                    }
                    break;

                case 32:
                    for (var i = samplesPerPixel; i < width * samplesPerPixel; i++)
                    {
                        var current = rowStart + i * 4;
                        var previous = rowStart + (i - samplesPerPixel) * 4;
                        var sum = unchecked(ReadUInt32(buffer, current, littleEndian) + ReadUInt32(buffer, previous, littleEndian));
                        WriteUInt32(buffer, current, sum, littleEndian);
                    }
                    break;

                default:
                    throw new NotSupportedException($"Predictor is not supported for {bitsPerSample}-bit samples.");
            }
        }
    }

    private static ushort ReadUInt16(byte[] buffer, int offset, bool littleEndian)
        => littleEndian
            ? (ushort)(buffer[offset] | (buffer[offset + 1] << 8))
            : (ushort)((buffer[offset] << 8) | buffer[offset + 1]);

    private static void WriteUInt16(byte[] buffer, int offset, ushort value, bool littleEndian)
    {
        if (littleEndian)
        {
            buffer[offset] = (byte)(value & 0xFF);
            buffer[offset + 1] = (byte)(value >> 8);
        }
        else
        {
            buffer[offset] = (byte)(value >> 8);
            buffer[offset + 1] = (byte)(value & 0xFF);
        }
    }

    private static uint ReadUInt32(byte[] buffer, int offset, bool littleEndian)
        => littleEndian
            ? (uint)(buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24))
            : (uint)((buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]);

    private static void WriteUInt32(byte[] buffer, int offset, uint value, bool littleEndian)
    {
        if (littleEndian)
        {
            buffer[offset] = (byte)(value & 0xFF);
            buffer[offset + 1] = (byte)((value >> 8) & 0xFF);
            buffer[offset + 2] = (byte)((value >> 16) & 0xFF);
            buffer[offset + 3] = (byte)((value >> 24) & 0xFF);
        }
        else
        {
            buffer[offset] = (byte)((value >> 24) & 0xFF);
            buffer[offset + 1] = (byte)((value >> 16) & 0xFF);
            buffer[offset + 2] = (byte)((value >> 8) & 0xFF);
            buffer[offset + 3] = (byte)(value & 0xFF);
        }
    }
}
