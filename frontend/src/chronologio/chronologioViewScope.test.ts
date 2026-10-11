import { chronologioViewScope } from './chronologioViewState';

const base = {
  axis: 'agricultural',
  periodYear: 2025,
  monthYear: 2026,
  month: 3,
  fieldId: undefined,
  category: 'all',
  lifecycleYear: '',
};

describe('QA-050 Chronologio view scope', () => {
  it('QA-050 switching Months -> Years changes scope immediately (loading panel, no stale Months)', () => {
    const months = chronologioViewScope({ ...base, zoom: 'year' });
    const years = chronologioViewScope({ ...base, zoom: 'years' });
    expect(years).not.toBe(months);
  });

  it('QA-050 Years scope ignores period/month focus so it cannot stick on loading', () => {
    const a = chronologioViewScope({ ...base, zoom: 'years', periodYear: 2024, month: 1 });
    const b = chronologioViewScope({ ...base, zoom: 'years', periodYear: 2026, month: 9 });
    expect(a).toBe(b);
  });

  it('QA-050 Months scope follows the period year, Days scope follows the month', () => {
    expect(chronologioViewScope({ ...base, zoom: 'year', periodYear: 2024 })).not.toBe(
      chronologioViewScope({ ...base, zoom: 'year', periodYear: 2025 })
    );
    expect(chronologioViewScope({ ...base, zoom: 'month', month: 4 })).not.toBe(
      chronologioViewScope({ ...base, zoom: 'month', month: 3 })
    );
  });
});
