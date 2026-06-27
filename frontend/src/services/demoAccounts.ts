export interface DemoAccount {
  email: string;
  password: string;
  role: string;
  displayName: string;
  userId: string;
}

/** Demo accounts seeded by the backend (DemoAccounts:Seed in Development). */
export const demoAccounts: DemoAccount[] = [
  {
    email: 'owner@olivefarm.com',
    password: 'password123',
    role: 'FieldOwner',
    displayName: 'Giorgos Papadakis (Owner)',
    userId: '675555555555555555555501',
  },
  {
    email: 'producer1@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Kostas Manousakis (Producer)',
    userId: '675555555555555555555502',
  },
];

/** @deprecated Use demoAccounts — kept for mock mode compatibility */
export const testUsers = demoAccounts;

export const getTestUsersByRole = (role?: string): DemoAccount[] => {
  if (!role) return demoAccounts;
  return demoAccounts.filter((user) => user.role === role);
};
