using OliveLifecycle.Core.Entities.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>Summarises a masked index raster into the statistics stored per observation.</summary>
public static class RasterStatistics
{
    /// <summary>
    /// Returns null when no valid pixels remain, so callers surface "no data" rather
    /// than a zeroed statistic that looks like a real measurement.
    /// </summary>
    public static VegetationIndexStats? Summarise(IReadOnlyList<double> values)
    {
        var valid = new List<double>(values.Count);
        foreach (var value in values)
        {
            if (!double.IsNaN(value))
            {
                valid.Add(value);
            }
        }

        if (valid.Count == 0)
        {
            return null;
        }

        valid.Sort();
        var mean = valid.Average();
        var variance = valid.Count > 1
            ? valid.Sum(v => (v - mean) * (v - mean)) / (valid.Count - 1)
            : 0;

        return new VegetationIndexStats
        {
            Mean = Math.Round(mean, 4),
            Median = Math.Round(Percentile(valid, 50), 4),
            Minimum = Math.Round(valid[0], 4),
            Maximum = Math.Round(valid[^1], 4),
            StandardDeviation = Math.Round(Math.Sqrt(variance), 4),
            P10 = Math.Round(Percentile(valid, 10), 4),
            P90 = Math.Round(Percentile(valid, 90), 4),
            ValidPixelCount = valid.Count
        };
    }

    /// <summary>Linear-interpolated percentile over an ascending list.</summary>
    public static double Percentile(IReadOnlyList<double> sorted, double percentile)
    {
        if (sorted.Count == 0)
        {
            return double.NaN;
        }

        if (sorted.Count == 1)
        {
            return sorted[0];
        }

        var rank = Math.Clamp(percentile, 0, 100) / 100.0 * (sorted.Count - 1);
        var lower = (int)Math.Floor(rank);
        var upper = (int)Math.Ceiling(rank);
        return lower == upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
    }

    /// <summary>
    /// Share of valid pixels that fall below a baseline value, used to report how much
    /// of a field is underperforming rather than just its average.
    /// </summary>
    public static double? ShareBelow(IReadOnlyList<double> values, double threshold)
        => Share(values, value => value < threshold);

    /// <summary>Share of valid pixels above a threshold, used for recovery and regrowth reporting.</summary>
    public static double? ShareAbove(IReadOnlyList<double> values, double threshold)
        => Share(values, value => value > threshold);

    private static double? Share(IReadOnlyList<double> values, Func<double, bool> predicate)
    {
        var valid = 0;
        var matching = 0;

        foreach (var value in values)
        {
            if (double.IsNaN(value))
            {
                continue;
            }

            valid++;
            if (predicate(value))
            {
                matching++;
            }
        }

        return valid == 0 ? null : Math.Round(matching * 100.0 / valid, 1);
    }
}
