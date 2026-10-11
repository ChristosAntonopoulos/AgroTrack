import enLegal from './en/legal.json';
import elLegal from './el/legal.json';
import itLegal from './it/legal.json';

type Section = { heading?: string; paragraphs?: string[] };

describe('QA-023 terms content is complete in every locale', () => {
  const locales: Array<[string, { terms: { title: string; intro: string; sections: Section[] } }]> = [
    ['en', enLegal as never],
    ['el', elLegal as never],
    ['it', itLegal as never],
  ];

  it.each(locales)('QA-023 %s terms has intro and essential sections', (_code, legal) => {
    expect(legal.terms.title.trim()).not.toBe('');
    expect(legal.terms.intro.trim()).not.toBe('');
    expect(legal.terms.sections.length).toBeGreaterThanOrEqual(6);
    legal.terms.sections.forEach((section) => {
      expect((section.heading || '').trim()).not.toBe('');
      expect((section.paragraphs || []).length).toBeGreaterThan(0);
    });
  });

  it('QA-023 locales have the same number of terms sections (English is not Greek-only)', () => {
    const counts = locales.map(([, legal]) => legal.terms.sections.length);
    expect(new Set(counts).size).toBe(1);
    expect(enLegal.terms.intro).not.toBe(elLegal.terms.intro);
  });
});
