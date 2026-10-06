import type { ChronologioEntry, ChronologioMedia } from '../services/chronologioService';
import { pickRealMediaUrl } from '../chronologio/mediaGuard';

export const isChronologioPhotoEntry = (entry: ChronologioEntry): boolean =>
  entry.category === 'photo' || entry.sourceType === 'Photo';

export type ChronologioDayDisplayItem =
  | { type: 'entry'; entry: ChronologioEntry }
  | { type: 'photoGroup'; id: string; entries: ChronologioEntry[] };

const isImageMedia = (m: ChronologioMedia): boolean => {
  if (/audio|voice|document/i.test(m.type || '')) return false;
  return Boolean(pickRealMediaUrl([m.thumbnailUrl, m.url]));
};

/**
 * Collapses all Photo Hub / photo-category entries for a single day into one
 * collage card, preserving the relative order of other entry types.
 */
export const groupSameDayPhotoEntries = (
  entries: ChronologioEntry[]
): ChronologioDayDisplayItem[] => {
  const photos = entries.filter(isChronologioPhotoEntry);
  if (photos.length <= 1) {
    return entries.map((entry) => ({ type: 'entry' as const, entry }));
  }

  const result: ChronologioDayDisplayItem[] = [];
  let inserted = false;
  for (const entry of entries) {
    if (isChronologioPhotoEntry(entry)) {
      if (!inserted) {
        result.push({
          type: 'photoGroup',
          id: `photo-day-${photos.map((p) => p.id).join('_')}`,
          entries: photos,
        });
        inserted = true;
      }
      continue;
    }
    result.push({ type: 'entry', entry });
  }
  return result;
};

/** Flatten image media from one or more Chronologio entries (deduped by id/url). */
export const collectChronologioImages = (
  entries: ChronologioEntry[]
): ChronologioMedia[] => {
  const seen = new Set<string>();
  const out: ChronologioMedia[] = [];
  for (const entry of entries) {
    for (const media of entry.media || []) {
      if (!isImageMedia(media)) continue;
      const key = media.id || media.url || media.thumbnailUrl || '';
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(media);
    }
  }
  return out;
};
