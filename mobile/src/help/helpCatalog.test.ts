import { describe, expect, it } from 'vitest';
import { filterHelpTopics, HELP_TOPICS } from './helpCatalog';

describe('helpCatalog', () => {
  const copy = (id: (typeof HELP_TOPICS)[number]['id']) => ({
    title: `Title ${id}`,
    body: `Body about ${id}`,
  });

  it('returns all topics when query is empty', () => {
    expect(filterHelpTopics('', copy)).toHaveLength(HELP_TOPICS.length);
    expect(filterHelpTopics('   ', copy)).toHaveLength(HELP_TOPICS.length);
  });

  it('matches English and Greek search tags', () => {
    const harvest = filterHelpTopics('συγκομιδή', copy);
    expect(harvest.map((t) => t.id)).toContain('harvest');

    const oil = filterHelpTopics('λάδι', copy);
    expect(oil.map((t) => t.id)).toEqual(expect.arrayContaining(['myOil', 'harvest']));
  });

  it('matches title and body text', () => {
    const found = filterHelpTopics('about chronologio', copy);
    expect(found.map((t) => t.id)).toContain('chronologio');
  });

  it('returns empty when nothing matches', () => {
    expect(filterHelpTopics('zzzz-no-match', copy)).toEqual([]);
  });
});
