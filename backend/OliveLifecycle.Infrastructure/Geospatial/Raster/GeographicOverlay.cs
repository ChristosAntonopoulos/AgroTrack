using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Infrastructure.Geospatial.Raster;

/// <summary>An index raster resampled onto a latitude/longitude aligned grid.</summary>
public sealed class GeographicOverlay
{
    public required double[] Values { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }

    /// <summary>[minLng, minLat, maxLng, maxLat] of the resampled raster.</summary>
    public required double[] Bounds { get; init; }
}

/// <summary>
/// Converts UTM-gridded rasters into latitude/longitude aligned images.
///
/// Analysis runs in UTM because its cells have equal ground area, which matters for
/// statistics. Map libraries, however, place an image overlay inside a geographic
/// bounding box with no rotation, and UTM grid north diverges from true north by up
/// to a few degrees. Drawing the projected raster directly would therefore show the
/// field slightly rotated against its own boundary, so overlays are resampled here.
/// </summary>
public static class GeographicResampler
{
    public static GeographicOverlay Resample(RasterGrid grid, double[] values)
    {
        if (!UtmProjection.TryParseEpsg(grid.Epsg, out var zone, out var northern))
        {
            throw new NotSupportedException($"EPSG:{grid.Epsg} is not a supported UTM projection.");
        }

        var bounds = GeographicBounds(grid, zone, northern);
        var minLng = bounds[0];
        var minLat = bounds[1];
        var maxLng = bounds[2];
        var maxLat = bounds[3];

        var width = grid.Width;
        var height = grid.Height;
        var lngStep = (maxLng - minLng) / width;
        var latStep = (maxLat - minLat) / height;

        var resampled = new double[width * height];
        Array.Fill(resampled, double.NaN);

        for (var row = 0; row < height; row++)
        {
            var latitude = maxLat - (row + 0.5) * latStep;

            for (var column = 0; column < width; column++)
            {
                var longitude = minLng + (column + 0.5) * lngStep;
                var (easting, northing) = UtmProjection.ToUtm(latitude, longitude, zone, northern);

                var sourceColumn = (int)Math.Floor((easting - grid.OriginX) / grid.PixelSize);
                var sourceRow = (int)Math.Floor((grid.OriginY - northing) / grid.PixelSize);

                if (sourceColumn < 0 || sourceColumn >= grid.Width || sourceRow < 0 || sourceRow >= grid.Height)
                {
                    continue;
                }

                resampled[row * width + column] = values[sourceRow * grid.Width + sourceColumn];
            }
        }

        return new GeographicOverlay
        {
            Values = resampled,
            Width = width,
            Height = height,
            Bounds = bounds
        };
    }

    /// <summary>[minLng, minLat, maxLng, maxLat] covering all four corners of the grid.</summary>
    public static double[] GeographicBounds(RasterGrid grid, int zone, bool northernHemisphere)
    {
        var corners = new[]
        {
            UtmProjection.ToLatLng(grid.MinX, grid.MinY, zone, northernHemisphere),
            UtmProjection.ToLatLng(grid.MinX, grid.MaxY, zone, northernHemisphere),
            UtmProjection.ToLatLng(grid.MaxX, grid.MinY, zone, northernHemisphere),
            UtmProjection.ToLatLng(grid.MaxX, grid.MaxY, zone, northernHemisphere)
        };

        return
        [
            corners.Min(c => c.Longitude),
            corners.Min(c => c.Latitude),
            corners.Max(c => c.Longitude),
            corners.Max(c => c.Latitude)
        ];
    }

    public static double[] GeographicBounds(RasterGrid grid)
    {
        if (!UtmProjection.TryParseEpsg(grid.Epsg, out var zone, out var northern))
        {
            throw new NotSupportedException($"EPSG:{grid.Epsg} is not a supported UTM projection.");
        }

        return GeographicBounds(grid, zone, northern);
    }
}
