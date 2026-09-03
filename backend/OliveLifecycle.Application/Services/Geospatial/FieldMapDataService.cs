using OliveLifecycle.Application.Abstractions.Geospatial;
using OliveLifecycle.Application.Abstractions.Persistence;
using OliveLifecycle.Application.DTOs.Geospatial;
using OliveLifecycle.Core.Entities.Geospatial;
using OliveLifecycle.Core.Geospatial;

namespace OliveLifecycle.Application.Services.Geospatial;

public interface IFieldMapDataService
{
    /// <summary>
    /// Resolves the requested map layers for a field into drawable overlays. An
    /// observation may be pinned to support the date selector and compare mode.
    /// </summary>
    Task<FieldMapDataDto> GetMapDataAsync(string fieldId, IReadOnlyList<string> layerIds, string? observationId, CancellationToken cancellationToken = default);
}

public class FieldMapDataService : IFieldMapDataService
{
    /// <summary>Number of legend entries generated per ramp.</summary>
    private const int LegendStopCount = 5;

    /// <summary>Layers backed by a stored raster from a satellite observation.</summary>
    private static readonly HashSet<string> SatelliteLayerIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "truecolor", "ndvi", "ndmi", "ndre", "ndwi", "savi", "ndvi-change"
    };

    private readonly IFieldSatelliteObservationRepository _observationRepository;
    private readonly IFieldSpatialProfileRepository _profileRepository;
    private readonly IMapLayerCatalog _layerCatalog;
    private readonly IGeospatialStorageService _storage;

    public FieldMapDataService(
        IFieldSatelliteObservationRepository observationRepository,
        IFieldSpatialProfileRepository profileRepository,
        IMapLayerCatalog layerCatalog,
        IGeospatialStorageService storage)
    {
        _observationRepository = observationRepository;
        _profileRepository = profileRepository;
        _layerCatalog = layerCatalog;
        _storage = storage;
    }

    public async Task<FieldMapDataDto> GetMapDataAsync(
        string fieldId,
        IReadOnlyList<string> layerIds,
        string? observationId,
        CancellationToken cancellationToken = default)
    {
        var definitions = _layerCatalog.GetOverlayLayers().ToDictionary(l => l.Id, StringComparer.OrdinalIgnoreCase);

        var observation = layerIds.Any(SatelliteLayerIds.Contains)
            ? await ResolveObservationAsync(fieldId, observationId, cancellationToken)
            : null;

        var profile = layerIds.Any(id => definitions.TryGetValue(id, out var d) && d.Category == "TERRAIN")
            ? await _profileRepository.GetByFieldIdAsync(fieldId, cancellationToken)
            : null;

        var layers = new List<MapLayerDataDto>(layerIds.Count);
        foreach (var layerId in layerIds)
        {
            definitions.TryGetValue(layerId, out var definition);
            layers.Add(BuildLayer(layerId, definition, observation, profile));
        }

        return new FieldMapDataDto
        {
            FieldId = fieldId,
            ObservationId = observation?.Id,
            ObservationDate = observation?.ObservationDate,
            Layers = layers
        };
    }

    private async Task<FieldSatelliteObservation?> ResolveObservationAsync(string fieldId, string? observationId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(observationId))
        {
            return await _observationRepository.GetLatestUsableAsync(fieldId, cancellationToken);
        }

        var requested = await _observationRepository.GetByIdAsync(observationId, cancellationToken);

        // Never serve another field's imagery, even if the identifier is valid.
        return requested?.FieldId == fieldId ? requested : null;
    }

    private MapLayerDataDto BuildLayer(
        string layerId,
        MapLayerDefinition? definition,
        FieldSatelliteObservation? observation,
        FieldSpatialProfile? profile)
    {
        var layer = new MapLayerDataDto
        {
            LayerId = layerId,
            Type = definition?.LayerType ?? "raster",
            TileUrlTemplate = definition?.TileUrlTemplate,
            Attribution = definition?.Attribution,
            SpatialResolution = definition?.SpatialResolution
        };

        if (definition == null)
        {
            layer.UnavailableReason = "Unknown layer.";
            return layer;
        }

        if (definition.Category == "SATELLITE")
        {
            ApplySatelliteLayer(layer, layerId, observation);
            return layer;
        }

        if (definition.Category == "TERRAIN")
        {
            // Terrain is reported as derived statistics rather than an image, because
            // a 30 m DEM cannot produce a meaningful picture of a few-hectare field.
            layer.Available = profile?.TerrainSummary != null;
            layer.UnavailableReason = layer.Available ? null : "Terrain has not been derived for this field yet.";
            return layer;
        }

        if (definition.LayerType == "raster")
        {
            // Externally tiled rasters need an endpoint to draw from.
            layer.Available = !string.IsNullOrWhiteSpace(definition.TileUrlTemplate);
            layer.UnavailableReason = layer.Available ? null : "No tile endpoint is configured for this layer.";
            return layer;
        }

        // Vector layers are drawn by the client from field and alert data it already
        // holds, so they are available as soon as they are defined.
        layer.Available = true;
        return layer;
    }

    private void ApplySatelliteLayer(MapLayerDataDto layer, string layerId, FieldSatelliteObservation? observation)
    {
        layer.Legend = BuildLegend(layerId);

        if (observation == null)
        {
            layer.UnavailableReason = "No usable satellite observation for this field yet.";
            return;
        }

        var path = SatelliteLayerPath(observation, layerId);
        if (path == null)
        {
            layer.UnavailableReason = layerId.Equals("ndvi-change", StringComparison.OrdinalIgnoreCase)
                ? "A second cloud-free observation is needed before change can be shown."
                : "This index was not available in the source scene.";
            return;
        }

        layer.Available = true;
        layer.ImageUrl = _storage.GetPublicUrl(path);
        layer.Bounds = observation.OverlayBounds;
        layer.SpatialResolution = observation.Resolution;

        if (observation.Metadata.Attribution is { Length: > 0 } attribution)
        {
            layer.Attribution = attribution;
        }
    }

    /// <summary>Maps a layer identifier to the raster stored for that observation.</summary>
    private static string? SatelliteLayerPath(FieldSatelliteObservation observation, string layerId) => layerId.ToLowerInvariant() switch
    {
        "truecolor" => observation.TrueColorStoragePath,
        "ndvi" => observation.NdviStoragePath,
        "ndmi" => observation.NdmiStoragePath,
        "ndre" => observation.NdreStoragePath,
        "ndwi" => observation.NdwiStoragePath,
        "savi" => observation.SaviStoragePath,
        "ndvi-change" => observation.NdviChangeStoragePath,
        _ => null
    };

    /// <summary>
    /// Builds the legend from the same ramp the raster was rendered with, so the
    /// colours a grower sees in the key always match the image.
    /// </summary>
    private static LayerLegendDto? BuildLegend(string layerId)
    {
        if (layerId.Equals("truecolor", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var ramp = ColourRamp.ForIndex(layerId);
        var stops = new List<LegendStopDto>(LegendStopCount);

        for (var i = 0; i < LegendStopCount; i++)
        {
            var position = (double)i / (LegendStopCount - 1);
            var (r, g, b) = ramp.Sample(ramp.ValueAt(position));
            stops.Add(new LegendStopDto
            {
                Position = Math.Round(position, 2),
                Value = Math.Round(ramp.ValueAt(position), 2),
                Colour = $"#{r:X2}{g:X2}{b:X2}"
            });
        }

        return new LayerLegendDto
        {
            Minimum = ramp.Minimum,
            Maximum = ramp.Maximum,
            Stops = stops
        };
    }
}
