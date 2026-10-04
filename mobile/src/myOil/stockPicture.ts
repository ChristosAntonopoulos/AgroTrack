import type { OilCommitment, OilPack, OilStockSummary } from '../services/oilStockService';

const round1 = (n: number) => Math.round(n * 10) / 10;

export type StockSliceKey = 'free' | 'held' | 'awaiting';

export type StockSlice = {
  key: StockSliceKey;
  litres: number;
  /** Share of oil still in the cellar. The three slices sum to 100 when there is oil. */
  pct: number;
};

const stillHere = (c: OilCommitment): number => {
  if (c.cancelled || c.derivedStatus === 'delivered' || c.derivedStatus === 'cancelled') return 0;
  return Math.max(0, c.remaining?.litres || 0);
};

const withPercents = (litres: number[]): number[] => {
  const sum = litres.reduce((total, n) => total + n, 0);
  if (sum <= 0.05) return litres.map(() => 0);
  const rounded = litres.map((n) => Math.round((n / sum) * 1000) / 10);
  const drift = Math.round((100 - rounded.reduce((total, n) => total + n, 0)) * 10) / 10;
  let largest = 0;
  litres.forEach((n, index) => {
    if (n > litres[largest]) largest = index;
  });
  rounded[largest] = Math.round((rounded[largest] + drift) * 10) / 10;
  return rounded;
};

/**
 * Oil still in the cellar. Sold oil that has already left is not a slice.
 * Awaiting is oil promised and waiting to be picked up — it is still here.
 */
export const cellarSlices = (
  summary: Pick<OilStockSummary, 'available' | 'held' | 'onHand' | 'openCommitments'>
): { total: number; slices: StockSlice[] } => {
  let held = 0;
  let awaiting = 0;
  for (const commitment of summary.openCommitments || []) {
    const litres = stillHere(commitment);
    if (litres <= 0.05) continue;
    if (commitment.derivedStatus === 'pending_delivery') awaiting += litres;
    else held += litres;
  }
  if (held + awaiting <= 0.05 && (summary.held?.litres || 0) > 0.05) {
    held = summary.held.litres;
  }
  const litres = [
    round1(Math.max(0, summary.available?.litres || 0)),
    round1(held),
    round1(awaiting),
  ];
  const pct = withPercents(litres);
  const keys: StockSliceKey[] = ['free', 'held', 'awaiting'];
  const sum = litres.reduce((total, n) => total + n, 0);
  return {
    total: round1(summary.onHand?.litres || sum),
    slices: keys.map((key, index) => ({ key, litres: litres[index], pct: pct[index] })),
  };
};

const isHousehold = (name: string) => {
  const n = name.trim().toLowerCase();
  return n === 'σπίτι' || n === 'home' || n === 'casa' || n === 'στο σπίτι' || n === 'for home';
};

const packLitres = (pack?: OilPack | null) => Math.max(0, pack?.litres || 0);

export type CellarFlow = {
  soldLitres: number;
  givenLitres: number;
  revenue: number;
  unpaid: number;
};

/** What left the cellar as business: sold this season, given away, money in and money still open. */
export const cellarFlow = (commitments: OilCommitment[]): CellarFlow => {
  let soldLitres = 0;
  let givenLitres = 0;
  let revenue = 0;
  let unpaid = 0;
  for (const commitment of commitments) {
    if (commitment.cancelled || commitment.derivedStatus === 'cancelled') continue;
    const sold =
      commitment.isSale &&
      (commitment.derivedStatus === 'pending_delivery' || commitment.derivedStatus === 'delivered');
    const paid =
      (commitment.amount != null && commitment.amount > 0) || Boolean(commitment.financialTransactionId);
    if (sold) {
      const litres =
        commitment.derivedStatus === 'delivered'
          ? packLitres(commitment.delivered) || packLitres(commitment.requested)
          : packLitres(commitment.requested) || packLitres(commitment.remaining);
      soldLitres += litres;
      if (commitment.amount != null && commitment.amount > 0) revenue += commitment.amount;
    } else if (
      !commitment.isSale &&
      commitment.derivedStatus === 'delivered' &&
      !isHousehold(commitment.counterpartyName || '')
    ) {
      givenLitres += packLitres(commitment.delivered) || packLitres(commitment.requested);
    }
    if (commitment.isSale && !paid && commitment.amount != null && commitment.amount > 0) {
      unpaid += commitment.amount;
    }
  }
  return {
    soldLitres: round1(soldLitres),
    givenLitres: round1(givenLitres),
    revenue: Math.round(revenue * 100) / 100,
    unpaid: Math.round(unpaid * 100) / 100,
  };
};

export type PackSegmentKey = 'bulk' | 'tin16' | 'tin17';

export type PackSegment = {
  key: PackSegmentKey;
  litres: number;
  count: number;
  pct: number;
};

/** How a shelf is packed: bulk, then 16 L tins, then 17 L tins. */
export const packSegments = (
  pack: Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres'>
): PackSegment[] => {
  const raw = [
    { key: 'bulk' as const, litres: round1(Math.max(0, pack.bulkLitres || 0)), count: 0 },
    { key: 'tin16' as const, litres: round1(Math.max(0, pack.tin16) * 16), count: Math.max(0, pack.tin16) },
    { key: 'tin17' as const, litres: round1(Math.max(0, pack.tin17) * 17), count: Math.max(0, pack.tin17) },
  ].filter((segment) => segment.litres > 0.05 || segment.count > 0);
  const pct = withPercents(raw.map((segment) => segment.litres));
  return raw.map((segment, index) => ({ ...segment, pct: pct[index] }));
};
