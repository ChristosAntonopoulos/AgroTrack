const STORAGE_KEY = 'oleachron.dailyBrief.dismissed';

type DismissMap = Record<string, string>; // proposalId → hideUntil ISO

const read = (): DismissMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DismissMap;
  } catch {
    return {};
  }
};

const write = (map: DismissMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

/** Active dismissals (not yet expired). */
export const getDismissedProposalIds = (now = new Date()): Set<string> => {
  const map = read();
  const active = new Set<string>();
  let dirty = false;
  for (const [id, until] of Object.entries(map)) {
    const t = new Date(until).getTime();
    if (Number.isNaN(t) || t <= now.getTime()) {
      delete map[id];
      dirty = true;
      continue;
    }
    active.add(id);
  }
  if (dirty) write(map);
  return active;
};

/** Hide for 7 days (or until conditions change — date-based for v1). */
export const dismissProposal = (id: string, days = 7) => {
  const map = read();
  const until = new Date();
  until.setDate(until.getDate() + days);
  map[id] = until.toISOString();
  write(map);
};
