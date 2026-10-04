import type { ChronologioEntry } from '../services/chronologioService';
import type { HarvestDaySummary } from '../harvestCampaign/totals';
import type { Field } from '../services/fieldService';
import { resolveFieldColor } from '../utils/fieldColors';

const dayHasProduction = (day: HarvestDaySummary) =>
  day.sacks > 0 ||
  day.officialKg > 0 ||
  day.estimatedKg > 0 ||
  day.oilKg > 0 ||
  day.people > 0 ||
  day.expenseEur > 0;

const fieldRef = (fields: Field[], fieldId: string) => {
  const field = fields.find((f) => f.id === fieldId);
  return {
    id: fieldId,
    name: field?.name || fieldId,
    color: field?.color ?? resolveFieldColor(null, fieldId),
  };
};

/** One Chronologio harvest card per campaign day (same numbers as the harvest page). */
export const chronologioEntriesFromHarvestDays = (
  days: HarvestDaySummary[],
  fields: Field[],
  preferredFieldId?: string | null
): ChronologioEntry[] => {
  const active = days.filter(dayHasProduction);
  return active.map((day) => {
    const primaryFieldId =
      (preferredFieldId && day.fieldIds.includes(preferredFieldId)
        ? preferredFieldId
        : day.fieldIds[0]) ||
      preferredFieldId ||
      fields[0]?.id ||
      '';
    const oliveKg = day.officialKg > 0 ? day.officialKg : day.estimatedKg;
    const field = fieldRef(fields, primaryFieldId);
    const entry: ChronologioEntry = {
      id: `Harvest:day:${day.date}`,
      category: 'harvest',
      fieldId: primaryFieldId,
      field,
      occurredAt: `${day.date}T12:00:00`,
      eventType: 'Harvest',
      title: 'Harvest',
      summary: null,
      sourceType: 'Harvest',
      sourceId: day.date,
      isSystemGenerated: true,
      actor: null,
      importance: 'normal',
      media: [],
      details: {
        harvest: {
          harvestId: day.date,
          oliveKg,
          oilKg: day.oilKg > 0 ? day.oilKg : undefined,
          workers: day.people,
          sackCount: day.sacks,
          hasOfficialWeight: day.officialKg > 0,
        },
      },
    };
    return entry;
  });
};

/** Prefer later sources when the same Harvest:day id appears more than once. */
export const mergeHarvestDayCards = (
  ...groups: ChronologioEntry[][]
): ChronologioEntry[] => {
  const byId = new Map<string, ChronologioEntry>();
  for (const group of groups) {
    for (const entry of group) {
      byId.set(entry.id, entry);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
};

/**
 * Prefer campaign/DB day cards; keep non-harvest API rows; drop duplicate API harvests
 * for days already covered by a day card.
 */
export const mergeHarvestDayTimeline = (
  apiEntries: ChronologioEntry[],
  campaignDayEntries: ChronologioEntry[]
): ChronologioEntry[] => {
  const campaignDays = new Set(
    campaignDayEntries.map((e) => e.id.replace(/^Harvest:day:/i, ''))
  );
  const withoutDupHarvest = apiEntries.filter((entry) => {
    if (entry.category !== 'harvest' && entry.sourceType !== 'Harvest') return true;
    const day = /^Harvest:day:/i.test(entry.id)
      ? entry.id.replace(/^Harvest:day:/i, '')
      : entry.occurredAt.slice(0, 10);
    return !campaignDays.has(day);
  });
  return [...campaignDayEntries, ...withoutDupHarvest].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
};
