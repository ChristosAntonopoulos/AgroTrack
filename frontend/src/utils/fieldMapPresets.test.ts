import { nextOverlayIds, resolveSimplePresetLayer } from './fieldMapPresets';

describe('field map presets', () => {
  it('keeps the field and frost presets free of a raster overlay', () => {
    expect(resolveSimplePresetLayer('field', ['ndvi']).layerId).toBeUndefined();
    expect(resolveSimplePresetLayer('frost', ['ndvi']).layerId).toBeUndefined();
  });

  it('prefers leaf moisture, then standing water, then a missing-data reason', () => {
    expect(resolveSimplePresetLayer('water', ['ndvi', 'ndmi']).layerId).toBe('ndmi');
    expect(resolveSimplePresetLayer('water', ['ndwi']).layerId).toBe('ndwi');
    expect(resolveSimplePresetLayer('water', ['ndvi']).missingKey).toBe('mapWorkspace.missingMoisture');
  });

  it('caps Full-mode overlays at three and lets the user replace by turning one off', () => {
    const full = nextOverlayIds(['ndvi', 'ndmi', 'truecolor'], 'savi');
    expect(full.blocked).toBe(true);
    expect(full.ids).toEqual(['ndvi', 'ndmi', 'truecolor']);
    expect(nextOverlayIds(['ndvi', 'ndmi', 'truecolor'], 'ndvi').ids).toEqual(['ndmi', 'truecolor']);
  });
});
