import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'oleachron.dailyBrief.dismissed';

type DismissMap = Record<string, string>;

export const loadDismissedIds = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const map = JSON.parse(raw) as DismissMap;
    const now = Date.now();
    const active = new Set<string>();
    const next: DismissMap = {};
    for (const [id, until] of Object.entries(map)) {
      const t = new Date(until).getTime();
      if (!Number.isNaN(t) && t > now) {
        active.add(id);
        next[id] = until;
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return active;
  } catch {
    return new Set();
  }
};

export const dismissProposal = async (id: string, days = 7) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const map: DismissMap = raw ? (JSON.parse(raw) as DismissMap) : {};
    const until = new Date();
    until.setDate(until.getDate() + days);
    map[id] = until.toISOString();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};
