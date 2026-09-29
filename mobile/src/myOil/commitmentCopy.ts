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
  labels: { today: string; yesterday: string }
): { dayKey: string; label: string; items: StockMovement[] }[] => {
  const today = new Date();
  const yday = new Date();
  yday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const map = new Map<string, StockMovement[]>();
  for (const m of movements) {
    const d = new Date(m.occurredOn);
    const key = Number.isNaN(d.getTime())
      ? m.occurredOn
      : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const list = map.get(key) || [];
    list.push(m);
    map.set(key, list);
  }

  return [...map.entries()].map(([dayKey, items]) => {
    const d = new Date(items[0].occurredOn);
    let label = items[0].occurredOn;
    if (!Number.isNaN(d.getTime())) {
      if (sameDay(d, today)) label = labels.today;
      else if (sameDay(d, yday)) label = labels.yesterday;
      else label = d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    }
    return { dayKey, label, items };
  });
};

export type OilStockTab = 'overview' | 'stock' | 'others' | 'lots';
export type CommitmentFilter = 'all' | 'held' | 'pending' | 'delivered';
export type PackFilter = 'all' | 'tin16' | 'tin17' | 'bulk';
