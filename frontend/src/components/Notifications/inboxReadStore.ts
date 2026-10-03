const READ_KEY = 'The Olive Lot_inbox_read_v1';

type ReadMap = Record<string, string[]>;

const loadMap = (): ReadMap => {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    // Legacy shape was a flat string[] shared across every account on this browser.
    if (Array.isArray(parsed)) {
      return { _: parsed.filter((id): id is string => typeof id === 'string') };
    }
    if (parsed && typeof parsed === 'object') {
      const map: ReadMap = {};
      for (const [userId, ids] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(ids)) {
          map[userId] = ids.filter((id): id is string => typeof id === 'string');
        }
      }
      return map;
    }
    return {};
  } catch {
    return {};
  }
};

const saveMap = (map: ReadMap) => {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  } catch {
    // Read state stays in memory for this session.
  }
};

const scopeKey = (userId?: string | null) => (userId && userId.trim() ? userId.trim() : '_');

export function readInboxIds(userId?: string | null): Set<string> {
  const map = loadMap();
  const key = scopeKey(userId);
  const scoped = map[key] || [];
  // One-time bridge: keep legacy unread-dismissals for the first signed-in user.
  if (scoped.length === 0 && key !== '_' && map._?.length) {
    return new Set(map._);
  }
  return new Set(scoped);
}

export function rememberInboxRead(id: string, userId?: string | null): void {
  const map = loadMap();
  const key = scopeKey(userId);
  const ids = new Set(map[key] || (key !== '_' ? map._ || [] : []));
  if (ids.has(id)) return;
  ids.add(id);
  map[key] = [...ids];
  if (key !== '_') delete map._;
  saveMap(map);
}
