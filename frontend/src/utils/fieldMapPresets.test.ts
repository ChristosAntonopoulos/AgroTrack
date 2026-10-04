import { nextOverlayIds } from './fieldMapPresets';

describe('field map overlays', () => {
  it('keeps a single overlay so stacked rasters cannot hide each other', () => {
    expect(nextOverlayIds(['ndvi'], 'ndmi').ids).toEqual(['ndmi']);
    expect(nextOverlayIds(['ndvi'], 'ndvi').ids).toEqual(['ndvi']);
    expect(nextOverlayIds(['ndvi'], undefined).ids).toEqual([]);
  });
});
