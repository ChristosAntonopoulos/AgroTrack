import type { HarvestRecord } from '../services/harvestService';
import {
  formatRelatedHarvestLabel,
  uniqueRelatedHarvestLabels,
} from './relatedHarvestLabel';

const base = (overrides: Partial<HarvestRecord> = {}): HarvestRecord => ({
  id: 'h1',
  fieldId: 'field-1',
  harvestDate: '2026-11-02T00:00:00Z',
  harvestMethod: 'hand',
  workersUsed: 2,
  oliveKg: 400,
  qualityGrade: 'extra',
  ...overrides,
});

describe('relatedHarvestLabel', () => {
  it('includes field, date, mill, and status when present', () => {
    const label = formatRelatedHarvestLabel(
      base({ millName: 'Mill', status: 'posted' }),
      {
        fieldName: 'North',
        locale: 'el',
        dateFormat: 'dd/MM/yyyy',
        statusLabel: () => 'Posted',
      }
    );
    expect(label).toContain('North');
    expect(label).toContain('Mill');
    expect(label).toContain('Posted');
    expect(label).not.toMatch(/2026-11-02/);
  });

  it('omits empty mill and status without inventing placeholders', () => {
    const label = formatRelatedHarvestLabel(base({ millName: undefined, status: undefined }), {
      fieldName: 'North',
      locale: 'en',
      dateFormat: 'yyyy-MM-dd',
    });
    expect(label.startsWith('North')).toBe(true);
    expect(label).not.toContain('undefined');
  });

  it('never leaves two identical date-only labels', () => {
    const harvests = [
      base({ id: 'a', millName: undefined, status: undefined, oliveKg: 100 }),
      base({ id: 'b', millName: undefined, status: undefined, oliveKg: 200 }),
    ];
    const labels = uniqueRelatedHarvestLabels(harvests, {
      locale: 'en',
      dateFormat: 'yyyy-MM-dd',
    });
    expect(labels.get('a')).not.toBe(labels.get('b'));
    expect(labels.get('a')).toContain('100 kg');
    expect(labels.get('b')).toContain('200 kg');
  });
});
