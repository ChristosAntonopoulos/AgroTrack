import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { packExceedsAvailable } from './packInput';

const available = { tin16: 0, tin17: 0, bulkLitres: 2.5, litres: 2.5 };

describe('packExceedsAvailable', () => {
  it('flags a bulk request above the selected stock', () => {
    assert.equal(
      packExceedsAvailable({ tin16: 0, tin17: 0, bulkLitres: 1000 }, available),
      true
    );
  });

  it('allows a request within the selected stock', () => {
    assert.equal(
      packExceedsAvailable({ tin16: 0, tin17: 0, bulkLitres: 2.5 }, available),
      false
    );
  });
});
