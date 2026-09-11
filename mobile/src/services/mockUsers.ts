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

export const testUsers: TestUser[] = [
  {
    email: 'owner@olivefarm.com',
    password: 'password123',
    role: 'FieldOwner',
    displayName: 'Γιώργος Παπαδάκης',
    firstName: 'Γιώργος',
    lastName: 'Παπαδάκης',
    userId: '675555555555555555555501',
    nameKey: 'login.demoGroveName',
    subtitleKey: 'login.demoGroveSubtitle',
  },
  {
    email: 'producer1@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Κώστας Μανούσακης',
    firstName: 'Κώστας',
    lastName: 'Μανούσακης',
    userId: '675555555555555555555502',
    nameKey: 'login.demoServicesName',
    subtitleKey: 'login.demoServicesSubtitle',
  },
  {
    email: 'producer2@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Ahmed Hassan',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    userId: 'user3',
  },
  {
    email: 'producer3@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Sophie Martin',
    firstName: 'Sophie',
    lastName: 'Martin',
    userId: 'user4',
  },
  {
    email: 'agronomist@olivefarm.com',
    password: 'password123',
    role: 'Agronomist',
    displayName: 'Dr. James Wilson',
    firstName: 'Dr. James',
    lastName: 'Wilson',
    userId: 'user5',
  },
  {
    email: 'admin@olivefarm.com',
    password: 'password123',
    role: 'Administrator',
    displayName: 'Admin User',
    firstName: 'Admin',
    lastName: 'User',
    userId: 'user6',
  },
  {
    email: 'service@olivefarm.com',
    password: 'password123',
    role: 'ServiceProvider',
    displayName: 'Service Provider',
    firstName: 'Service',
    lastName: 'Provider',
    userId: 'user7',
  },
];

export const getTestUsersByRole = (role?: string): TestUser[] => {
  if (!role) return testUsers;
  return testUsers.filter(user => user.role === role);
};

export const getUserByEmail = (email: string): TestUser | undefined => {
  return testUsers.find(user => user.email === email);
};

/** Owner + primary producer — shown on mobile demo login */
export const mobileDemoUsers = testUsers.filter(
  (u): u is TestUser & { nameKey: string; subtitleKey: string } =>
    Boolean(u.nameKey && u.subtitleKey) &&
    (u.role === 'FieldOwner' || u.email === 'producer1@olivefarm.com')
);
