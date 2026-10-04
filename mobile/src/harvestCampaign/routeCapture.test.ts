import { shouldRouteCaptureToHarvest } from './routeCapture';

describe('shouldRouteCaptureToHarvest', () => {
  it('opens the live harvest only when harvest was chosen', () => {
    expect(shouldRouteCaptureToHarvest()).toBe(false);
    expect(shouldRouteCaptureToHarvest('harvest')).toBe(true);
  });

  it('leaves money, work, and observation on generic capture', () => {
    expect(shouldRouteCaptureToHarvest('money')).toBe(false);
    expect(shouldRouteCaptureToHarvest('work')).toBe(false);
    expect(shouldRouteCaptureToHarvest('observation')).toBe(false);
    expect(shouldRouteCaptureToHarvest('expense')).toBe(false);
  });
});
