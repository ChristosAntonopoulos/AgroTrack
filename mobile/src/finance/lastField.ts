import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_FIELD_KEY = 'Oleachron.money.lastFieldId';

export async function readLastMoneyFieldId(): Promise<string | undefined> {
  try {
    return (await AsyncStorage.getItem(LAST_FIELD_KEY)) || undefined;
  } catch {
    return undefined;
  }
}

export async function rememberLastMoneyFieldId(fieldId: string | undefined): Promise<void> {
  try {
    if (!fieldId) {
      await AsyncStorage.removeItem(LAST_FIELD_KEY);
      return;
    }
    await AsyncStorage.setItem(LAST_FIELD_KEY, fieldId);
  } catch {
    /* ignore quota / private mode */
  }
}
