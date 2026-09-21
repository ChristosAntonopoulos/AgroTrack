import { shouldRouteCaptureToHarvest } from './routeCapture';

describe('shouldRouteCaptureToHarvest', () => {
  it('sends generic plus and harvest capture into the harvest add menu', () => {
    expect(shouldRouteCaptureToHarvest()).toBe(true);
    expect(shouldRouteCaptureToHarvest('harvest')).toBe(true);
  });

  it('leaves money, work, and observation on generic capture', () => {
    expect(shouldRouteCaptureToHarvest('money')).toBe(false);
    expect(shouldRouteCaptureToHarvest('work')).toBe(false);
    expect(shouldRouteCaptureToHarvest('observation')).toBe(false);
    expect(shouldRouteCaptureToHarvest('expense')).toBe(false);
  });
});
