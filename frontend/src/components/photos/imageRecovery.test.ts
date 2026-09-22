import { imageRecoveryMode } from './imageRecovery';

describe('imageRecoveryMode', () => {
  it('offers try again on the first failure', () => {
    expect(imageRecoveryMode(0, true)).toBe('retry');
  });

  it('offers remove, replace, or report after a retry still fails', () => {
    expect(imageRecoveryMode(1, true)).toBe('choices');
  });

  it('stays quiet while the image is fine', () => {
    expect(imageRecoveryMode(2, false)).toBe('none');
  });
});
