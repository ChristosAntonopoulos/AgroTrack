import { athensCalendarDateKey } from '../utils/athensDate';
import {
  allocatedMillKgForField,
  allocatedOilKgForField,
  millFieldShares,
  oilFieldShares,
} from './allocation';
import type {
  HarvestCampaign,
  HarvestFieldStatus,
  HarvestOilEntry,
  HarvestPeopleEntry,
  HarvestSackEntry,
} from './types';

const OIL_KG_PER_LITRE = 0.916;

export type HarvestDaySummary = {
  date: string;
  sacks: number;
  estimatedKg: number;
  officialKg: number;
  people: number;
  personDays: number;
  expenseEur: number;
  oilKg: number;
  photos: number;
  fieldIds: string[];
  closed: boolean;
};

export type HarvestFieldSummary = {
  fieldId: string;
  status: HarvestFieldStatus;
  officialKg: number;
  estimatedKg: number;
  sacks: number;
  oilKg: number;
  /** True when this field's oil/mill comes from a multi-field lot. */
  shared: boolean;
};

export type HarvestCampaignTotals = {
  officialKg: number;
  unweighedSacks: number;
  unweighedEstimatedKg: number;
  oilKg: number;
  extractionYield: number | null;
  harvestDays: number;
  personDays: number;
  expenseEur: number;
  millKgWithoutOil: number;
};

const estimatedFromSacks = (entry: HarvestSackEntry): number =>
  entry.kgPerSack && entry.kgPerSack > 0 ? entry.sacks * entry.kgPerSack : 0;

export const oilAmountToKg = (entry: HarvestOilEntry): number =>
  entry.unit === 'litres' ? entry.amount * OIL_KG_PER_LITRE : entry.amount;

export const personDaysFrom = (entry: HarvestPeopleEntry): number => {
  if (entry.hours === 'half') return entry.people * 0.5;
  if (entry.hours === 'other' && entry.otherHours && entry.otherHours > 0) {
    return entry.people * (entry.otherHours / 8);
  }
  return entry.people;
};

export const harvestDayNumber = (campaign: HarvestCampaign, today: string): number => {
  if (!campaign.startedAt) return 1;
  const start = athensCalendarDateKey(campaign.startedAt);
  const startMs = Date.parse(`${start}T12:00:00`);
  const todayMs = Date.parse(`${today}T12:00:00`);
  if (!Number.isFinite(startMs) || !Number.isFinite(todayMs)) return 1;
  return Math.max(1, Math.floor((todayMs - startMs) / 86_400_000) + 1);
};

export const linkedSackIds = (campaign: HarvestCampaign): Set<string> => {
  const ids = new Set<string>();
  for (const mill of campaign.millWeights) {
    for (const sackId of mill.sackIds) ids.add(sackId);
  }
  for (const sack of campaign.sacks) {
    if (sack.millWeightId) ids.add(sack.id);
  }
  return ids;
};

export const isSackWeighed = (sack: HarvestSackEntry, linked: Set<string>) =>
  Boolean(sack.millWeightId) || linked.has(sack.id);

/**
 * Official mill kilograms replace estimated sack kilograms in totals.
 * Sacks remain in history. Never add the two masses together.
 */
export const campaignTotals = (campaign: HarvestCampaign): HarvestCampaignTotals => {
  const linked = linkedSackIds(campaign);
  const officialKg = campaign.millWeights.reduce((sum, row) => sum + row.kg, 0);
  const unweighed = campaign.sacks.filter((sack) => !isSackWeighed(sack, linked));
  const unweighedSacks = unweighed.reduce((sum, row) => sum + row.sacks, 0);
  const unweighedEstimatedKg = unweighed.reduce((sum, row) => sum + estimatedFromSacks(row), 0);
  const oilKg = campaign.oils.reduce((sum, row) => sum + oilAmountToKg(row), 0);
  const harvestDays = new Set(
    [
      ...campaign.sacks.map((row) => row.date),
      ...campaign.millWeights.map((row) => row.date),
      ...campaign.oils.map((row) => row.date),
      ...campaign.peopleLogs.map((row) => row.date),
    ].filter(Boolean)
  ).size;
  const personDays = campaign.peopleLogs.reduce((sum, row) => sum + personDaysFrom(row), 0);
  const peopleCost = campaign.peopleLogs.reduce((sum, row) => sum + (row.costEur || 0), 0);
  const spend = campaign.expenses.reduce((sum, row) => sum + row.amountEur, 0) + peopleCost;

  const oilCoversHarvest = campaign.oils.some((row) => row.millWeightIds.length === 0);
  const millIdsWithOil = new Set(campaign.oils.flatMap((row) => row.millWeightIds));
  const millKgWithoutOil = oilCoversHarvest
    ? 0
    : campaign.millWeights
        .filter((row) => !millIdsWithOil.has(row.id))
        .reduce((sum, row) => sum + row.kg, 0);

  return {
    officialKg,
    unweighedSacks,
    unweighedEstimatedKg,
    oilKg,
    extractionYield: officialKg > 0 && oilKg > 0 ? (oilKg / officialKg) * 100 : null,
    harvestDays,
    personDays,
    expenseEur: spend,
    millKgWithoutOil,
  };
};

export const fieldSummaries = (
  campaign: HarvestCampaign,
  fieldIds: string[]
): HarvestFieldSummary[] => {
  const linked = linkedSackIds(campaign);
  const ids = fieldIds.length > 0 ? fieldIds : uniqueFieldIds(campaign);
  return ids.map((fieldId) => {
    const sacks = campaign.sacks.filter((row) => row.fieldId === fieldId);
    const millRows = campaign.millWeights.filter((row) =>
      millFieldShares(campaign, row).some((s) => s.fieldId === fieldId)
    );
    const unallocatedMill = campaign.millWeights.filter(
      (row) => millFieldShares(campaign, row).length === 0 && row.fieldIds.length === 0
    );
    const oilRows = campaign.oils.filter((row) =>
      oilFieldShares(campaign, row).some((s) => s.fieldId === fieldId)
    );

    const officialKg =
      millRows.reduce((sum, row) => sum + allocatedMillKgForField(campaign, row, fieldId), 0) +
      (ids.length === 1 ? unallocatedMill.reduce((sum, row) => sum + row.kg, 0) : 0);

    const oilKg = oilRows.reduce(
      (sum, row) => sum + allocatedOilKgForField(campaign, row, fieldId),
      0
    );

    const shared =
      millRows.some((row) => millFieldShares(campaign, row).length > 1) ||
      oilRows.some((row) => oilFieldShares(campaign, row).length > 1);

    const unweighed = sacks.filter((sack) => !isSackWeighed(sack, linked));
    const status: HarvestFieldStatus = campaign.groveDoneIds.includes(fieldId)
      ? 'done'
      : sacks.length > 0 || millRows.length > 0 || oilRows.length > 0
        ? 'in_progress'
        : 'not_started';
    return {
      fieldId,
      status,
      officialKg,
      estimatedKg: unweighed.reduce((sum, row) => sum + estimatedFromSacks(row), 0),
      sacks: sacks.reduce((sum, row) => sum + row.sacks, 0),
      oilKg,
      shared,
    };
  });
};

export const uniqueFieldIds = (campaign: HarvestCampaign): string[] => {
  const ids = [
    ...campaign.fieldOrder,
    ...campaign.sacks.map((row) => row.fieldId),
    ...campaign.millWeights.flatMap((row) =>
      row.fieldShares && row.fieldShares.length > 0
        ? row.fieldShares.map((s) => s.fieldId)
        : row.fieldIds
    ),
    ...campaign.oils.flatMap((row) =>
      row.fieldShares && row.fieldShares.length > 0
        ? row.fieldShares.map((s) => s.fieldId)
        : row.fieldIds
    ),
  ];
  return [...new Set(ids.filter(Boolean))];
};

export const daySummary = (campaign: HarvestCampaign, date: string): HarvestDaySummary => {
  const linked = linkedSackIds(campaign);
  const sacks = campaign.sacks.filter((row) => row.date === date);
  const mill = campaign.millWeights.filter((row) => row.date === date);
  const oils = campaign.oils.filter((row) => row.date === date);
  const people = campaign.peopleLogs.filter((row) => row.date === date);
  const expenses = campaign.expenses.filter((row) => row.date === date);
  const notes = campaign.notes.filter((row) => row.date === date);
  const officialKg = mill.reduce((sum, row) => sum + row.kg, 0);
  const weighed = new Set(mill.flatMap((row) => row.sackIds));
  const estimatedKg = sacks
    .filter((sack) => !isSackWeighed(sack, linked) && !weighed.has(sack.id))
    .reduce((sum, row) => sum + estimatedFromSacks(row), 0);
  const peopleCost = people.reduce((sum, row) => sum + (row.costEur || 0), 0);
  const fieldIds = [
    ...sacks.map((row) => row.fieldId),
    ...mill.flatMap((row) =>
      row.fieldShares && row.fieldShares.length > 0
        ? row.fieldShares.map((s) => s.fieldId)
        : row.fieldIds
    ),
    ...oils.flatMap((row) =>
      row.fieldShares && row.fieldShares.length > 0
        ? row.fieldShares.map((s) => s.fieldId)
        : row.fieldIds
    ),
  ].filter(Boolean);

  return {
    date,
    sacks: sacks.reduce((sum, row) => sum + row.sacks, 0),
    estimatedKg: officialKg > 0 ? 0 : estimatedKg,
    officialKg,
    people: people.reduce((sum, row) => sum + row.people, 0),
    personDays: people.reduce((sum, row) => sum + personDaysFrom(row), 0),
    expenseEur: expenses.reduce((sum, row) => sum + row.amountEur, 0) + peopleCost,
    oilKg: oils.reduce((sum, row) => sum + oilAmountToKg(row), 0),
    photos:
      notes.reduce((sum, row) => sum + (row.photoCount || 0), 0) +
      mill.reduce((sum, row) => sum + (row.photoCount || 0), 0),
    fieldIds: [...new Set(fieldIds)],
    closed: campaign.closedDays.includes(date),
  };
};

export const allDaySummaries = (campaign: HarvestCampaign): HarvestDaySummary[] => {
  const dates = new Set([
    ...campaign.sacks.map((row) => row.date),
    ...campaign.millWeights.map((row) => row.date),
    ...campaign.oils.map((row) => row.date),
    ...campaign.peopleLogs.map((row) => row.date),
    ...campaign.expenses.map((row) => row.date),
    ...campaign.notes.map((row) => row.date),
    ...campaign.closedDays,
  ]);
  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => daySummary(campaign, date));
};
