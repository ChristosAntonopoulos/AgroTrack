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

const mapRow = (row: ContactPickerRow): PickedDeviceContact | null => {
  const displayName = row.name?.find((n) => n.trim())?.trim() || '';
  const phone = row.tel?.find((n) => n.trim())?.trim();
  const email = row.email?.find((n) => n.trim())?.trim();
  if (!displayName && !phone && !email) return null;
  return { displayName: displayName || phone || email || '', phone, email };
};

export function canPickDeviceContact(): boolean {
  if (typeof navigator === 'undefined') return false;
  const contacts = (navigator as ContactPickerNavigator).contacts;
  return typeof contacts?.select === 'function';
}

/** Single contact (back-compat). */
export async function pickDeviceContact(): Promise<PickedDeviceContact | null> {
  const rows = await pickDeviceContacts({ multiple: false });
  return rows[0] || null;
}

/** Contact Picker API — supports one or many when the browser allows it. */
export async function pickDeviceContacts(options?: {
  multiple?: boolean;
}): Promise<PickedDeviceContact[]> {
  if (!canPickDeviceContact()) return [];
  const contacts = (navigator as ContactPickerNavigator).contacts;
  if (!contacts) return [];
  const multiple = Boolean(options?.multiple);
  const rows = await contacts.select(['name', 'tel', 'email'], { multiple });
  return (rows || []).map(mapRow).filter((row): row is PickedDeviceContact => Boolean(row));
}
