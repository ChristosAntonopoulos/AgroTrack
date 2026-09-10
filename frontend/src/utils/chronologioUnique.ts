import type { ChronologioEntry } from '../services/chronologioService';

/** One Chronologio fact appears once, even when the API repeats source rows. */
export function uniqueChronologioEntries(entries: ChronologioEntry[]): ChronologioEntry[] {
  const seen = new Set<string>();
  return [...entries]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .filter((entry) => {
      const keys = [entry.id, entry.sourceId ? `${entry.eventType}:${entry.sourceId}` : ''].filter(Boolean);
      if (keys.some((key) => seen.has(key))) return false;
      keys.forEach((key) => seen.add(key));
      return true;
    });
}
