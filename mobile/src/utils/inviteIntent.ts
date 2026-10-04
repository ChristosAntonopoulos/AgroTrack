import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@Oleachron/inviteIntent';

export type InviteIntent = {
  token?: string;
  code?: string;
  email?: string;
  name?: string;
};

let memory: InviteIntent | null = null;

const tokenFromValue = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

export const mergeInviteIntent = (...parts: Array<InviteIntent | null | undefined>): InviteIntent => {
  const merged: InviteIntent = {};
  for (const part of parts) {
    if (!part) continue;
    if (part.token) merged.token = tokenFromValue(part.token);
    if (part.code) merged.code = tokenFromValue(part.code);
    if (part.email?.trim()) merged.email = part.email.trim();
    if (part.name?.trim()) merged.name = part.name.trim();
  }
  return merged;
};

export const readInviteIntent = async (): Promise<InviteIntent | null> => {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    memory = JSON.parse(raw) as InviteIntent;
    return memory;
  } catch {
    return null;
  }
};

export const saveInviteIntent = async (intent: InviteIntent) => {
  const next = mergeInviteIntent(intent);
  if (!next.token && !next.code) {
    memory = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  memory = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const rememberInviteIntent = async (
  ...parts: Array<InviteIntent | null | undefined>
): Promise<InviteIntent> => {
  const next = mergeInviteIntent(await readInviteIntent(), ...parts);
  await saveInviteIntent(next);
  return next;
};

export const clearInviteIntent = async () => {
  memory = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
};
