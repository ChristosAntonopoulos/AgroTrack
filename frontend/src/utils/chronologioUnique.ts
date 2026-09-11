import { chronologioEventKey, chronologioEventKeyId } from '../chronologio/eventPresentation';
import type { ChronologioEntry } from '../services/chronologioService';

/** Pagination / merge safety. Source dedup belongs in the Chronologio read model. */
export function uniqueChronologioEntries(entries: ChronologioEntry[]): ChronologioEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const identity = chronologioEventKeyId(chronologioEventKey(entry)) || entry.id;
    if (seen.has(identity) || seen.has(entry.id)) return false;
    seen.add(identity);
    seen.add(entry.id);
    return true;
  });
}
