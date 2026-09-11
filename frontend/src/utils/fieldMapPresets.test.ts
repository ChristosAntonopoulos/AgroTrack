import { nextOverlayIds } from './fieldMapPresets';

describe('field map overlays', () => {
  it('caps overlays at three and lets the user replace by turning one off', () => {
    const full = nextOverlayIds(['ndvi', 'ndmi', 'truecolor'], 'savi');
    expect(full.blocked).toBe(true);
    expect(full.ids).toEqual(['ndvi', 'ndmi', 'truecolor']);
    expect(nextOverlayIds(['ndvi', 'ndmi', 'truecolor'], 'ndvi').ids).toEqual(['ndmi', 'truecolor']);
  });
});
