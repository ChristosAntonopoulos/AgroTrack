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
    displayName: 'John Smith',
    userId: 'user1',
  },
  {
    email: 'producer1@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Maria Garcia',
    userId: 'user2',
  },
  {
    email: 'producer2@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Ahmed Hassan',
    userId: 'user3',
  },
  {
    email: 'producer3@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Sophie Martin',
    userId: 'user4',
  },
  {
    email: 'agronomist@olivefarm.com',
    password: 'password123',
    role: 'Agronomist',
    displayName: 'Dr. James Wilson',
    userId: 'user5',
  },
];

export const getTestUsersByRole = (role?: string): TestUser[] => {
  if (!role) return testUsers;
  return testUsers.filter(user => user.role === role);
};
