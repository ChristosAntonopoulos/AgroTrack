export type PickedDeviceContact = {
  displayName: string;
  phone?: string;
  email?: string;
};

type ContactPickerRow = {
  name?: string[];
  tel?: string[];
  email?: string[];
};

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (properties: string[], options?: { multiple?: boolean }) => Promise<ContactPickerRow[]>;
  };
};

export function canPickDeviceContact(): boolean {
  if (typeof navigator === 'undefined') return false;
  const contacts = (navigator as ContactPickerNavigator).contacts;
  return typeof contacts?.select === 'function';
}

export async function pickDeviceContact(): Promise<PickedDeviceContact | null> {
  if (!canPickDeviceContact()) return null;
  const contacts = (navigator as ContactPickerNavigator).contacts;
  if (!contacts) return null;
  const [row] = await contacts.select(['name', 'tel', 'email'], { multiple: false });
  if (!row) return null;
  const displayName = row.name?.find((n) => n.trim())?.trim() || '';
  const phone = row.tel?.find((n) => n.trim())?.trim();
  const email = row.email?.find((n) => n.trim())?.trim();
  if (!displayName && !phone && !email) return null;
  return { displayName: displayName || phone || email || '', phone, email };
}
