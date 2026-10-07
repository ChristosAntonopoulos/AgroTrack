/** Review accounts seeded by the backend (DemoAccounts:Seed). Not shown on the login UI. */
export interface ReviewAccount {
  id: 'admin' | 'collaborator';
  email: string;
  password: string;
  role: string;
  displayName: string;
  userId: string;
}

export const reviewAccounts: ReviewAccount[] = [
  {
    id: 'admin',
    email: 'review.admin@theolivelot.com',
    password: 'Filiatra#Harvest26',
    role: 'FieldOwner',
    displayName: 'Γιώργος Παπαδάκης',
    userId: '675555555555555555555501',
  },
  {
    id: 'collaborator',
    email: 'review.collaborator@theolivelot.com',
    password: 'Kostas#Partner26',
    role: 'Producer',
    displayName: 'Κώστας Μανούσακης',
    userId: '675555555555555555555502',
  },
];

/** @deprecated Use reviewAccounts */
export type DemoAccount = ReviewAccount;
/** @deprecated Use reviewAccounts */
export const demoAccounts = reviewAccounts;
/** @deprecated Use reviewAccounts */
export const testUsers = reviewAccounts;

export const getTestUsersByRole = (role?: string): ReviewAccount[] => {
  if (!role) return reviewAccounts;
  return reviewAccounts.filter((user) => user.role === role);
};
