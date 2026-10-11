import { getFieldsEmptyKeys } from './fieldsEmptyState';

describe('QA-022 fields empty state', () => {
  it('QA-022 archived filter without search does not mention search terms', () => {
    const keys = getFieldsEmptyKeys('', 'archived');
    expect(keys.title).toBe('fields:emptyArchivedTitle');
    expect(keys.description).toBe('fields:emptyArchivedDescription');
  });

  it('QA-022 whitespace-only search counts as no search', () => {
    expect(getFieldsEmptyKeys('   ', 'archived').title).toBe('fields:emptyArchivedTitle');
  });

  it('QA-022 active search keeps the search copy', () => {
    expect(getFieldsEmptyKeys('olive', 'archived').description).toBe('fields:emptySearchDescription');
    expect(getFieldsEmptyKeys('olive', 'active').title).toBe('fields:emptySearchTitle');
  });

  it('QA-022 other filters with no search use the neutral filter message', () => {
    expect(getFieldsEmptyKeys('', 'active').description).toBe('fields:emptyFilterDescription');
  });
});
