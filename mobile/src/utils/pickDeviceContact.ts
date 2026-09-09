import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';

export type PickedDeviceContact = {
  displayName: string;
  phone?: string;
  email?: string;
};

export function canPickDeviceContact(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function pickDeviceContact(): Promise<PickedDeviceContact | null> {
  if (!canPickDeviceContact()) {
    return null;
  }

  try {
    // iOS picker does not need the full address-book permission. Android does.
    if (Platform.OS === 'android') {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        return null;
      }
    }

    const picked = await Contacts.presentContactPickerAsync();
    if (!picked) {
      return null;
    }

    const displayName =
      picked.name?.trim() ||
      [picked.firstName, picked.lastName].filter(Boolean).join(' ').trim();
    const phone = picked.phoneNumbers?.find((row) => row.number?.trim())?.number?.trim();
    const emails = (picked as { emails?: Array<{ email?: string }> }).emails;
    const email = emails?.find((row) => row.email?.trim())?.email?.trim();
    if (!displayName && !phone && !email) {
      return null;
    }

    return { displayName: displayName || phone || email || '', phone, email };
  } catch {
    return null;
  }
}
