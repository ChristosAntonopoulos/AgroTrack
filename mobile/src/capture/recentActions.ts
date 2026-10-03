import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_KEY = 'Oleachron.capture.recentMoves';
const LAST_FIELD_KEY = 'Oleachron.capture.lastFieldId';
const MAX_RECENT = 12;

export async function readRecentCaptureMoves(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export async function rememberCaptureMove(id: string | undefined): Promise<void> {
  if (!id) return;
  try {
    const prev = await readRecentCaptureMoves();
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export async function readLastCaptureFieldId(): Promise<string | undefined> {
  try {
    return (await AsyncStorage.getItem(LAST_FIELD_KEY)) || undefined;
  } catch {
    return undefined;
  }
}

export async function rememberLastCaptureFieldId(fieldId: string | undefined): Promise<void> {
  try {
    if (!fieldId) {
      await AsyncStorage.removeItem(LAST_FIELD_KEY);
      return;
    }
    await AsyncStorage.setItem(LAST_FIELD_KEY, fieldId);
  } catch {
    /* ignore quota */
  }
}
