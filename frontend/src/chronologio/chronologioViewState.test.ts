import {
  chronologioScrollKey,
  isChronologioReturnState,
  readChronologioFocus,
  readChronologioJournalScroll,
  saveChronologioFocus,
  saveChronologioJournalScroll,
} from './chronologioViewState';

describe('chronologioViewState', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('builds a stable scroll key from zoom, date, and field', () => {
    expect(
      chronologioScrollKey({ zoom: 'month', focusDate: '2026-03-15T12:00:00Z', fieldId: 'f1' })
    ).toBe('month.2026-03-15.f1');
    expect(chronologioScrollKey({ zoom: 'year', focusDate: '', fieldId: '' })).toBe(
      'year.today.all'
    );
  });

  it('round-trips journal scroll offsets', () => {
    saveChronologioJournalScroll('month.2026-03-15.all', 420.6);
    expect(readChronologioJournalScroll('month.2026-03-15.all')).toBe(421);
    expect(readChronologioJournalScroll('missing')).toBeNull();
  });

  it('round-trips focus snapshots', () => {
    saveChronologioFocus({ focusDate: '2026-03-15', zoom: 'month', fieldId: 'grove-1' });
    expect(readChronologioFocus()).toEqual({
      focusDate: '2026-03-15',
      zoom: 'month',
      fieldId: 'grove-1',
    });
  });

  it('recognizes router return state', () => {
    expect(isChronologioReturnState({ search: '?view=days&date=2026-03-15' })).toBe(true);
    expect(isChronologioReturnState({ scrollTop: 10 })).toBe(false);
    expect(isChronologioReturnState(null)).toBe(false);
  });
});
