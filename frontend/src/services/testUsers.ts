export interface TestUser {
  email: string;
  password: string;
  role: string;
  displayName: string;
  userId: string;
}

export const testUsers: TestUser[] = [
  {
    email: 'owner@olivefarm.com',
    password: 'password123',
    role: 'FieldOwner',
    displayName: 'Γιώργος Παπαδάκης',
    userId: 'user1',
  },
  {
    email: 'producer1@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Κώστας Μανουσάκης',
    userId: 'user2',
  },
];

export const getTestUsersByRole = (role?: string): TestUser[] => {
  if (!role) return testUsers;
  return testUsers.filter(user => user.role === role);
};
