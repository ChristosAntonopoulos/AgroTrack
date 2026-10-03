import type { OilCommitment, OilPack, StockMovement } from '../services/oilStockService';

const round1 = (n: number) => Math.round(n * 10) / 10;

export const tinCount = (pack: Pick<OilPack, 'tin16' | 'tin17'>): number =>
  Math.max(0, pack.tin16) + Math.max(0, pack.tin17);

export const heldForOthers = (
  reserved: OilPack,
  pending: OilPack
): Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'> => {
  const tin16 = reserved.tin16 + pending.tin16;
  const tin17 = reserved.tin17 + pending.tin17;
  const bulkLitres = round1(reserved.bulkLitres + pending.bulkLitres);
  return {
    tin16,
    tin17,
    bulkLitres,
    litres: round1(tin16 * 16 + tin17 * 17 + bulkLitres),
  };
};

/** Commitments tagged as household (Σπίτι / Home / Casa), not third parties. */
export const isHouseholdCommitment = (c: Pick<OilCommitment, 'counterpartyName'>): boolean => {
  const n = (c.counterpartyName || '').trim().toLowerCase();
  return n === 'σπίτι' || n === 'home' || n === 'casa' || n === 'στο σπίτι' || n === 'for home';
};

/** Oil the house still has: set aside in the warehouse, or already taken home. */
export const householdPackOf = (
  c: Pick<OilCommitment, 'derivedStatus' | 'cancelled' | 'delivered' | 'requested' | 'remaining'>
): OilPack => {
  if (c.derivedStatus === 'delivered' && !c.cancelled) {
    const taken = c.delivered;
    if (taken.tin16 > 0 || taken.tin17 > 0 || taken.bulkLitres > 0.05 || taken.litres > 0.05) {
      return taken;
    }
    return c.requested;
  }
  return c.remaining;
};

export const visibleHouseholdCommitments = (
  open: OilCommitment[],
  closed: OilCommitment[] = []
): OilCommitment[] => {
  const openHome = open.filter((c) => isHouseholdCommitment(c) && !c.cancelled);
  const openIds = new Set(openHome.map((c) => c.id));
  const takenHome = closed.filter(
    (c) =>
      isHouseholdCommitment(c) &&
      !c.cancelled &&
      c.derivedStatus === 'delivered' &&
      !openIds.has(c.id)
  );
  return [...openHome, ...takenHome];
};

export const sumCommitmentPack = (
  items: Pick<OilCommitment, 'remaining'>[]
): Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'> => {
  let tin16 = 0;
  let tin17 = 0;
  let bulkLitres = 0;
  for (const c of items) {
    tin16 += c.remaining.tin16;
    tin17 += c.remaining.tin17;
    bulkLitres += c.remaining.bulkLitres;
  }
  bulkLitres = round1(bulkLitres);
  return {
    tin16,
    tin17,
    bulkLitres,
    litres: round1(tin16 * 16 + tin17 * 17 + bulkLitres),
  };
};

export const sumHouseholdPack = (items: OilCommitment[]) =>
  sumCommitmentPack(items.map((c) => ({ remaining: householdPackOf(c) })));

export type CommitmentStoryKey =
  | 'paidWaiting'
  | 'waitingPickup'
  | 'heldUnpaid'
  | 'heldForDate'
  | 'heldForSomeone'
  | 'heldGeneric'
  | 'atHome'
  | 'delivered';

/** Human sentence for a commitment — never expose backend status words. */
export const commitmentStoryKey = (c: OilCommitment): CommitmentStoryKey => {
  if (c.derivedStatus === 'delivered' && !c.cancelled && isHouseholdCommitment(c)) return 'atHome';
  if (c.derivedStatus === 'delivered' || c.cancelled) return 'delivered';
  if (c.derivedStatus === 'pending_delivery') {
    return c.isSale ? 'paidWaiting' : 'waitingPickup';
  }
  if (c.isSale && (c.amount == null || c.amount <= 0) && !c.financialTransactionId) {
    return 'heldUnpaid';
  }
  if (c.promisedFor) return 'heldForDate';
  if (c.counterpartyName?.trim()) return 'heldForSomeone';
  return 'heldGeneric';
};

export const deliverButtonKey = (c: OilCommitment): 'markDelivered' | 'theyTookIt' =>
  c.isSale || c.derivedStatus === 'pending_delivery' ? 'markDelivered' : 'theyTookIt';

/** A reservation is either still standing, finished, or called off. Nothing in between. */
export type HoldState = 'active' | 'completed' | 'cancelled';

export const holdState = (c: Pick<OilCommitment, 'cancelled' | 'derivedStatus'>): HoldState => {
  if (c.cancelled || c.derivedStatus === 'cancelled') return 'cancelled';
  if (c.derivedStatus === 'delivered') return 'completed';
  return 'active';
};

/** Human timeline verbs — not technical event kinds. */
export const movementActionKey = (kind: string): string => {
  switch (kind) {
    case 'produced':
      return 'produced';
    case 'packed':
    case 'repacked':
      return 'filledTins';
    case 'reserved':
      return 'held';
    case 'reservation_cancelled':
      return 'holdCancelled';
    case 'sold':
      return 'sold';
    case 'delivered':
      return 'delivered';
    case 'home_use':
      return 'homeUse';
    case 'gifted':
      return 'gifted';
    case 'shared_out':
      return 'sharedOut';
    case 'shared_in':
      return 'sharedIn';
    case 'consumed':
      return 'consumed';
    case 'correction':
    case 'returned':
      return 'corrected';
    default:
      return 'other';
  }
};

export const groupMovementsByDay = (
  movements: StockMovement[],
  locale: string,
  labels: { today: string; yesterday: string; thisWeek?: string }
): { dayKey: string; label: string; items: StockMovement[] }[] => {
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const map = new Map<string, { label: string; items: StockMovement[]; rank: number; time: number }>();
  for (const m of movements) {
    const d = new Date(m.occurredOn);
    let key = m.occurredOn;
    let label = m.occurredOn;
    let rank = 3;
    let time = 0;
    if (!Number.isNaN(d.getTime())) {
      time = d.getTime();
      if (sameDay(d, today)) {
        key = 'today';
        label = labels.today;
        rank = 0;
      } else if (sameDay(d, yday)) {
        key = 'yesterday';
        label = labels.yesterday;
        rank = 1;
      } else if (labels.thisWeek && d >= weekStart) {
        key = 'week';
        label = labels.thisWeek;
        rank = 2;
      } else {
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        label = d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
      }
    }
    const existing = map.get(key);
    if (existing) existing.items.push(m);
    else map.set(key, { label, items: [m], rank, time });
  }

  return [...map.entries()]
    .sort((a, b) => a[1].rank - b[1].rank || b[1].time - a[1].time)
    .map(([dayKey, group]) => ({ dayKey, label: group.label, items: group.items }));
};

/** Stock = what you have; holds = what you promised; movements = what happened. */
export type OilStockTab = 'stock' | 'holds' | 'movements';
export type CommitmentFilter = 'all' | 'held' | 'pending' | 'delivered';
/** Who the oil was for: anyone, a hold, or a sale. */
export type CommitmentKind = 'all' | 'held' | 'sold';
/** Still in the cellar, or already handed over. */
export type CommitmentLens = 'waiting' | 'delivered';
/** Κρατήσεις: everything, still open, already handed over, or a sale with no payment. */
export type CommitmentView = 'all' | 'waiting' | 'delivered' | 'unpaid';

/** Movements a farmer may undo — everything they could have simply mistyped. */
const REVERSIBLE_KINDS = new Set([
  'gifted',
  'sold',
  'consumed',
  'home_use',
  'correction',
  'returned',
  'shared_out',
]);

export const canReverseMovement = (m: StockMovement): boolean =>
  !m.reversalOfMovementId && REVERSIBLE_KINDS.has(m.kind);

/** Ids that already carry an undo, so the button is not offered twice. */
export const undoneMovementIds = (movements: StockMovement[]): Set<string> =>
  new Set(
    movements
      .map((m) => m.reversalOfMovementId)
      .filter((id): id is string => Boolean(id))
  );

/** Needs-now: waiting pickup or unpaid sale holds (not household). */
export const needsNowCommitments = (open: OilCommitment[]): OilCommitment[] =>
  open.filter((c) => {
    if (isHouseholdCommitment(c) || c.cancelled) return false;
    if (c.derivedStatus === 'pending_delivery') return true;
    if (c.isSale && (c.amount == null || c.amount <= 0) && !c.financialTransactionId) return true;
    return false;
  });
