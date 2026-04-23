const prisma = {
  user: {
    findUnique: vi.fn(),
  },
};

const databaseModulePath = require.resolve('../../src/config/database');
const socketServiceModulePath = require.resolve('../../src/services/socketService');

delete require.cache[databaseModulePath];
delete require.cache[socketServiceModulePath];

require.cache[databaseModulePath] = {
  id: databaseModulePath,
  filename: databaseModulePath,
  loaded: true,
  exports: { prisma },
};

const { getUserFromSocketToken } = require('../../src/services/socketService');
const { createAccessToken } = require('../../src/utils/tokens');

const learnerUser = {
  id: 'learner-1',
  email: 'learner@example.com',
  role: 'LEARNER',
  status: 'ACTIVE',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('socket JWT authentication', () => {
  test('returns the user for a valid JWT socket token', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: learnerUser.id,
      email: learnerUser.email,
      firstName: 'Learner',
      lastName: 'One',
      role: learnerUser.role,
      status: learnerUser.status,
    });

    const user = await getUserFromSocketToken(createAccessToken(learnerUser));

    expect(user).toMatchObject({
      id: learnerUser.id,
      email: learnerUser.email,
      role: learnerUser.role,
      status: learnerUser.status,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: learnerUser.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
  });

  test('accepts bearer-prefixed socket tokens', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: learnerUser.id,
      email: learnerUser.email,
      firstName: 'Learner',
      lastName: 'One',
      role: learnerUser.role,
      status: learnerUser.status,
    });

    const token = `Bearer ${createAccessToken(learnerUser)}`;
    const user = await getUserFromSocketToken(token);

    expect(user?.id).toBe(learnerUser.id);
  });

  test('returns null for invalid socket tokens', async () => {
    const user = await getUserFromSocketToken('demo-token-learner-1');

    expect(user).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
