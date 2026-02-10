export interface TestUser {
  email: string;
  password: string;
  role: string;
  displayName: string;
  userId: string;
  firstName: string;
  lastName: string;
}

export const testUsers: TestUser[] = [
  {
    email: 'owner@olivefarm.com',
    password: 'password123',
    role: 'FieldOwner',
    displayName: 'John Smith',
    firstName: 'John',
    lastName: 'Smith',
    userId: 'user1',
  },
  {
    email: 'producer1@olivefarm.com',
    password: 'password123',
    role: 'Producer',
    displayName: 'Maria Garcia',
    firstName: 'Maria',
    lastName: 'Garcia',
    userId: 'user2',
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
