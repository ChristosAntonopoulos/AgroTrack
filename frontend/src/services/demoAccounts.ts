import { Home, Handshake, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DemoAccount {
  id: 'grove' | 'partner' | 'family';
  email: string;
  password: string;
  role: string;
  /** @deprecated Prefer i18n keys via `id` */
  displayName: string;
  userId: string;
  nameKey: string;
  subtitleKey: string;
}

/** Demo accounts seeded by the backend (DemoAccounts:Seed in Development). */
export const demoAccounts: DemoAccount[] = [
  {
    id: 'grove',
    email: 'owner@olivefarm.com',
    password: 'password123',
    role: 'FieldOwner',
    displayName: 'Γιώργος Παπαδάκης',
    userId: '675555555555555555555501',
    nameKey: 'login.demoGroveName',
    subtitleKey: 'login.demoGroveSubtitle',
  },
  {
    id: 'partner',
    email: 'producer1@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Κώστας Μανούσακης',
    userId: '675555555555555555555502',
    nameKey: 'login.demoServicesName',
    subtitleKey: 'login.demoServicesSubtitle',
  },
  {
    id: 'family',
    email: 'family@olivefarm.com',
    password: 'password123',
    role: 'FieldOwner',
    displayName: 'Ελένη Παπαδάκη',
    userId: '675555555555555555555503',
    nameKey: 'login.demoFamilyName',
    subtitleKey: 'login.demoFamilyNameSubtitle',
  },
];

export const demoAccountIcons: Record<DemoAccount['id'], LucideIcon> = {
  grove: Sprout,
  partner: Handshake,
  family: Home,
};

/** @deprecated Use demoAccounts — kept for mock mode compatibility */
export const testUsers = demoAccounts;

export const getTestUsersByRole = (role?: string): DemoAccount[] => {
  if (!role) return demoAccounts;
  return demoAccounts.filter((user) => user.role === role);
};
