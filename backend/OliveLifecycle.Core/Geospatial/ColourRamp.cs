namespace OliveLifecycle.Core.Geospatial;

public readonly record struct RampStop(double Position, byte R, byte G, byte B)
{
    public string ToHex() => $"#{R:X2}{G:X2}{B:X2}";
}

/// <summary>
/// Colour ramps for the vegetation index overlays.
///
/// These live in the domain rather than next to the renderer because both the
/// raster generator and the legend shown in the apps read from them. Keeping one
/// definition means a legend can never disagree with the image it describes.
/// </summary>
public sealed class ColourRamp
{
    public required string Id { get; init; }
    public required double Minimum { get; init; }
    public required double Maximum { get; init; }
    public required IReadOnlyList<RampStop> Stops { get; init; }

    /// <summary>Bare soil through stressed yellow to vigorous green.</summary>
    public static readonly ColourRamp Ndvi = new()
    {
        Id = "ndvi",
        Minimum = -0.1,
        Maximum = 0.9,
        Stops =
        [
            new RampStop(0.00, 0xA6, 0x61, 0x1A),
            new RampStop(0.25, 0xDF, 0xC2, 0x7D),
            new RampStop(0.50, 0xF7, 0xF7, 0xA8),
            new RampStop(0.75, 0x7F, 0xBC, 0x41),
            new RampStop(1.00, 0x1B, 0x78, 0x37)
        ]
    };

    /// <summary>Dry brown through to wet blue, for canopy moisture.</summary>
    public static readonly ColourRamp Ndmi = new()
    {
        Id = "ndmi",
        Minimum = -0.3,
        Maximum = 0.6,
        Stops =
        [
            new RampStop(0.00, 0x8C, 0x51, 0x0A),
            new RampStop(0.35, 0xF6, 0xE8, 0xC3),
            new RampStop(0.65, 0x80, 0xCD, 0xC1),
            new RampStop(1.00, 0x01, 0x66, 0x5E)
        ]
    };

    /// <summary>Diverging ramp centred on no change, for NDVI difference maps.</summary>
    public static readonly ColourRamp Change = new()
    {
        Id = "ndvi-change",
        Minimum = -0.25,
        Maximum = 0.25,
        Stops =
        [
            new RampStop(0.00, 0xB2, 0x18, 0x2B),
            new RampStop(0.35, 0xF4, 0xA5, 0x82),
            new RampStop(0.50, 0xF7, 0xF7, 0xF7),
            new RampStop(0.65, 0x92, 0xC5, 0xDE),
            new RampStop(1.00, 0x21, 0x66, 0xAC)
        ]
    };

    public static ColourRamp ForIndex(string indexId) => indexId.ToLowerInvariant() switch
    {
        "ndmi" or "ndwi" => Ndmi,
        "ndvi-change" or "change" => Change,
        _ => Ndvi
    };

    /// <summary>Interpolates the ramp colour for a value, clamping outside the declared range.</summary>
    public (byte R, byte G, byte B) Sample(double value)
    {
        var span = Maximum - Minimum;
        var position = span <= 0 ? 0 : Math.Clamp((value - Minimum) / span, 0, 1);

        for (var i = 1; i < Stops.Count; i++)
        {
            var previous = Stops[i - 1];
            var current = Stops[i];
            if (position > current.Position && i < Stops.Count - 1)
            {
                continue;
            }

            var segment = current.Position - previous.Position;
            var t = segment <= 0 ? 0 : Math.Clamp((position - previous.Position) / segment, 0, 1);
            return (
                (byte)Math.Round(previous.R + (current.R - previous.R) * t),
                (byte)Math.Round(previous.G + (current.G - previous.G) * t),
                (byte)Math.Round(previous.B + (current.B - previous.B) * t));
        }

        var first = Stops[0];
        return (first.R, first.G, first.B);
    }

    /// <summary>Index value a ramp position corresponds to, used to label legends.</summary>
    public double ValueAt(double position) => Minimum + (Maximum - Minimum) * Math.Clamp(position, 0, 1);
}
