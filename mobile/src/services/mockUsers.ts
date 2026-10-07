export interface TestUser {
  email: string;
  password: string;
  role: string;
  displayName: string;
  userId: string;
  firstName: string;
  lastName: string;
  nameKey?: string;
  subtitleKey?: string;
}

/** Matches backend review accounts (DemoAccounts:Seed). */
export const testUsers: TestUser[] = [
  {
    email: 'review.admin@theolivelot.com',
    password: 'Filiatra#Harvest26',
    role: 'FieldOwner',
    displayName: 'Γιώργος Παπαδάκης',
    firstName: 'Γιώργος',
    lastName: 'Παπαδάκης',
    userId: '675555555555555555555501',
  },
  {
    email: 'review.collaborator@theolivelot.com',
    password: 'Kostas#Partner26',
    role: 'Producer',
    displayName: 'Κώστας Μανούσακης',
    firstName: 'Κώστας',
    lastName: 'Μανούσακης',
    userId: '675555555555555555555502',
  },
];

export const getTestUsersByRole = (role?: string): TestUser[] => {
  if (!role) return testUsers;
  return testUsers.filter((user) => user.role === role);
};

export const getUserByEmail = (email: string): TestUser | undefined => {
  return testUsers.find((user) => user.email === email);
};

/** @deprecated Demo login picker removed — kept for mock-mode callers. */
export const mobileDemoUsers = testUsers;
