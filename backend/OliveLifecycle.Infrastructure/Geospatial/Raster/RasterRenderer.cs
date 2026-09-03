using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>Turns index and reflectance grids into RGBA buffers ready for PNG encoding.</summary>
public static class RasterRenderer
{
    /// <summary>
    /// Renders an index grid with a colour ramp. Pixels with no data stay fully
    /// transparent so the base map shows through outside the field boundary.
    /// </summary>
    public static byte[] RenderIndex(IReadOnlyList<double> values, int width, int height, ColourRamp ramp)
    {
        var pixels = new byte[width * height * 4];

        for (var i = 0; i < width * height && i < values.Count; i++)
        {
            var value = values[i];
            if (double.IsNaN(value))
            {
                continue;
            }

            var (r, g, b) = ramp.Sample(value);
            var offset = i * 4;
            pixels[offset] = r;
            pixels[offset + 1] = g;
            pixels[offset + 2] = b;
            pixels[offset + 3] = 255;
        }

        return pixels;
    }

    /// <summary>
    /// Renders a true-colour composite from red, green and blue reflectance grids.
    /// A percentile stretch is applied per band because raw Sentinel-2 reflectance
    /// occupies a narrow part of the range and looks almost black otherwise.
    /// </summary>
    public static byte[] RenderTrueColour(
        IReadOnlyList<double> red,
        IReadOnlyList<double> green,
        IReadOnlyList<double> blue,
        int width,
        int height)
    {
        var redStretch = ComputeStretch(red);
        var greenStretch = ComputeStretch(green);
        var blueStretch = ComputeStretch(blue);

        var pixels = new byte[width * height * 4];

        for (var i = 0; i < width * height; i++)
        {
            if (i >= red.Count || i >= green.Count || i >= blue.Count)
            {
                break;
            }

            if (double.IsNaN(red[i]) || double.IsNaN(green[i]) || double.IsNaN(blue[i]))
            {
                continue;
            }

            var offset = i * 4;
            pixels[offset] = Stretch(red[i], redStretch);
            pixels[offset + 1] = Stretch(green[i], greenStretch);
            pixels[offset + 2] = Stretch(blue[i], blueStretch);
            pixels[offset + 3] = 255;
        }

        return pixels;
    }

    private static (double Low, double High) ComputeStretch(IReadOnlyList<double> values)
    {
        var valid = values.Where(v => !double.IsNaN(v)).ToList();
        if (valid.Count == 0)
        {
            return (0, 1);
        }

        valid.Sort();
        var low = RasterStatistics.Percentile(valid, 2);
        var high = RasterStatistics.Percentile(valid, 98);
        return high - low < 1e-6 ? (low, low + 1e-6) : (low, high);
    }

    private static byte Stretch(double value, (double Low, double High) stretch)
    {
        var normalised = (value - stretch.Low) / (stretch.High - stretch.Low);
        return (byte)Math.Round(Math.Clamp(normalised, 0, 1) * 255);
    }
}
