const request = require('supertest');

const prisma = {
  user: {
    findUnique: vi.fn(),
  },
  conversation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  conversationParticipant: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  message: {
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
};

const ioEmit = vi.fn();
const ioMock = {
  to: vi.fn(() => ({ emit: ioEmit })),
};

const databaseModulePath = require.resolve('../../src/config/database');
const socketServiceModulePath = require.resolve('../../src/services/socketService');
const appModulePath = require.resolve('../../src/app');

delete require.cache[databaseModulePath];
delete require.cache[socketServiceModulePath];
delete require.cache[appModulePath];

require.cache[databaseModulePath] = {
  id: databaseModulePath,
  filename: databaseModulePath,
  loaded: true,
  exports: { prisma },
};

require.cache[socketServiceModulePath] = {
  id: socketServiceModulePath,
  filename: socketServiceModulePath,
  loaded: true,
  exports: {
    getSocketIO: () => ioMock,
    initSocket: vi.fn(),
  },
};

const app = require('../../src/app');
const { createAccessToken } = require('../../src/utils/tokens');

const learnerUser = {
  id: 'learner-1',
  email: 'learner@example.com',
  role: 'LEARNER',
  status: 'ACTIVE',
};

const otherUser = {
  id: 'tutor-1',
  email: 'tutor@example.com',
  role: 'TUTOR',
  status: 'ACTIVE',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('messages and notifications integration tests', () => {
  test('creates a new conversation with another user', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(learnerUser)
      .mockResolvedValueOnce(otherUser);
    prisma.conversation.findFirst.mockResolvedValueOnce(null);
    prisma.conversation.create.mockResolvedValueOnce({
      id: 'conversation-1',
      participants: [
        { userId: learnerUser.id, user: { id: learnerUser.id, firstName: 'Learner', lastName: 'One' } },
        { userId: otherUser.id, user: { id: otherUser.id, firstName: 'Tutor', lastName: 'Two' } },
      ],
      messages: [],
    });

    const response = await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({ userId: otherUser.id });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('conversation-1');
  });

  test('sends a message to the other conversation participant and emits socket events', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.conversationParticipant.findUnique.mockResolvedValueOnce({
      conversationId: 'conversation-1',
      userId: learnerUser.id,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValueOnce({
      conversationId: 'conversation-1',
      userId: otherUser.id,
    });
    prisma.message.create.mockResolvedValueOnce({
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: learnerUser.id,
      receiverId: otherUser.id,
      content: 'Hello tutor',
      status: 'SENT',
      sender: {
        id: learnerUser.id,
        firstName: 'Learner',
        lastName: 'One',
        avatar: null,
      },
    });
    prisma.conversation.update.mockResolvedValueOnce({ id: 'conversation-1' });

    const response = await request(app)
      .post('/api/v1/messages/conversations/conversation-1')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`)
      .send({ content: 'Hello tutor' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.content).toBe('Hello tutor');
    expect(ioMock.to).toHaveBeenCalledWith(`user:${otherUser.id}`);
    expect(ioMock.to).toHaveBeenCalledWith('conversation:conversation-1');
    expect(ioEmit).toHaveBeenCalled();
  });

  test('returns unread message count for the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.message.count.mockResolvedValueOnce(3);

    const response = await request(app)
      .get('/api/v1/messages/unread-count')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { count: 3 },
    });
  });

  test('returns paginated notifications for the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notification-1',
        userId: learnerUser.id,
        type: 'message',
        title: 'New message',
        message: 'You have a new message',
        read: false,
        timestamp: new Date('2026-04-23T09:00:00.000Z'),
        link: '/messages',
      },
    ]);
    prisma.notification.count.mockResolvedValueOnce(1);

    const response = await request(app)
      .get('/api/v1/notifications?status=unread&page=1&limit=10')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notifications).toHaveLength(1);
    expect(response.body.data.pagination.total).toBe(1);
  });

  test('marks selected notifications as read', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(learnerUser);
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 2 });

    const response = await request(app)
      .put('/api/v1/notifications/read?ids=n1,n2')
      .set('Authorization', `Bearer ${createAccessToken(learnerUser)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Notifications marked as read',
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['n1', 'n2'] },
        userId: learnerUser.id,
      },
      data: {
        read: true,
      },
    });
  });
});
