const request = require('supertest');
const { beforeEach, describe, expect, test, vi } = require('vitest');

const prisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const sendVerificationEmail = vi.fn();

vi.mock('../../src/config/database', () => ({
  prisma,
}));

vi.mock('../../src/services/emailService', () => ({
  sendVerificationEmail,
}));

const app = require('../../src/app');
const { createAccessToken, createRefreshToken } = require('../../src/utils/tokens');
const { hashPassword } = require('../../src/utils/passwords');

const baseUser = {
  id: 'user-1',
  email: 'learner@example.com',
  firstName: 'Learner',
  lastName: 'Example',
  timezone: 'UTC',
  role: 'LEARNER',
  status: 'ACTIVE',
  avatar: null,
  phone: null,
  bio: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  lastLoginAt: null,
  isEmailVerified: true,
  tutorProfile: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_VERIFICATION_REQUIRED = 'true';
});

describe('auth API integration tests', () => {
  test('registers a learner account and returns verification delivery details', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      ...baseUser,
      email: 'newlearner@example.com',
      firstName: 'New',
      lastName: 'Learner',
      isEmailVerified: false,
    });
    sendVerificationEmail.mockResolvedValueOnce({
      delivered: false,
      deliveryMethod: 'log',
      verificationUrl: 'http://localhost:8080/verify-email?token=test-token',
    });

    const response = await request(app).post('/api/v1/auth/register').send({
      email: '  NewLearner@example.com ',
      password: 'Secure1!',
      firstName: 'New',
      lastName: 'Learner',
      role: 'LEARNER',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.verificationDelivery).toBe('log');
    expect(response.body.verificationUrl).toContain('/verify-email?token=');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'newlearner@example.com' },
    });
    expect(prisma.user.create).toHaveBeenCalled();
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newlearner@example.com',
        firstName: 'New',
      })
    );
  });

  test('rejects login when email verification is required but the account is unverified', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      password: hashPassword('Secure1!'),
      isEmailVerified: false,
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'learner@example.com',
      password: 'Secure1!',
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Please verify your email before logging in.');
  });

  test('logs in a verified user and returns access and refresh tokens', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      ...baseUser,
      password: hashPassword('Secure1!'),
      isEmailVerified: true,
    });
    prisma.user.update.mockResolvedValueOnce({
      ...baseUser,
      lastLoginAt: new Date('2026-04-23T09:00:00.000Z'),
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('x-forwarded-for', '203.0.113.5')
      .send({
        email: 'learner@example.com',
        password: 'Secure1!',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
    expect(response.body.user.email).toBe('learner@example.com');
    expect(response.body.user.ipAddress).toBe('203.0.113.5');
  });

  test('refreshes an access token for a valid refresh token', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(baseUser);
    const refreshToken = createRefreshToken(baseUser);

    const response = await request(app).post('/api/v1/auth/refresh-token').send({
      refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.message).toBe('Token refreshed.');
  });

  test('returns the current user for a valid bearer token', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce(baseUser);

    const accessToken = createAccessToken(baseUser);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-real-ip', '198.51.100.10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toMatchObject({
      id: baseUser.id,
      email: baseUser.email,
      ipAddress: '198.51.100.10',
    });
  });
});
