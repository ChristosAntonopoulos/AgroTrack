import { shouldRouteCaptureToHarvest } from './routeCapture';

describe('shouldRouteCaptureToHarvest', () => {
  it('opens the live harvest only when harvest was chosen', () => {
    expect(shouldRouteCaptureToHarvest()).toBe(false);
    expect(shouldRouteCaptureToHarvest('harvest')).toBe(true);
  });

  it('leaves money, work moves, observation, and photo on generic capture', () => {
    expect(shouldRouteCaptureToHarvest('money')).toBe(false);
    expect(shouldRouteCaptureToHarvest('scheduleWork')).toBe(false);
    expect(shouldRouteCaptureToHarvest('recordWork')).toBe(false);
    expect(shouldRouteCaptureToHarvest('observation')).toBe(false);
    expect(shouldRouteCaptureToHarvest('photo')).toBe(false);
    expect(shouldRouteCaptureToHarvest('expense')).toBe(false);
  });
});
